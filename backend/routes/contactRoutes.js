const express = require("express");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many contact attempts. Please try again later." },
});

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/", contactLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const comment = String(req.body?.comment || "").trim();

    if (!name || !email || !comment) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(500).json({
        message: "Email service is not configured on the server",
      });
    }

    const toAddress = process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER;
    const fromAddress = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

    if (!toAddress || !fromAddress) {
      return res.status(500).json({
        message: "Contact email destination is not configured on the server",
      });
    }

    const subject = `New contact message from ${name}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || "Not provided"}`,
      "",
      "Message:",
      comment,
    ].join("\n");

    const html = `
      <h2>New contact message</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(comment).replace(/\n/g, "<br />")}</p>
    `;

    await transporter.sendMail({
      from: `Food Rescue Contact <${fromAddress}>`,
      to: toAddress,
      replyTo: email,
      subject,
      text,
      html,
    });

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact email failed:", err.code || err.message);
    if (err && err.code === "EAUTH") {
      return res.status(500).json({
        message: "Gmail rejected the SMTP login. Use a Google app password for SMTP, not your normal account password.",
      });
    }
    return res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;
