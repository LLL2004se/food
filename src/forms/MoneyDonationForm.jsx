import React, { useState } from 'react';

const API_BASE = "https://food-backend-d44t.onrender.com";
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SnBJoENu84eKZp";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function MoneyDonationForm({ onDone, auth, onRequireLogin }) {
  const [amount, setAmount] = useState(500);
  const [purpose, setPurpose] = useState("Food donation");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showSuccessGif, setShowSuccessGif] = useState(false);

  const PAYMENT_GIF_SRC = encodeURI("/Online Payment.gif");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const token = auth?.user?.token || localStorage.getItem("token");
    if (!token) {
      setError("Please log in to donate money.");
      if (typeof onRequireLogin === "function") {
        onRequireLogin();
      }
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }

    setSubmitting(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Unable to load Razorpay checkout. Please try again.");
        return;
      }

      const orderResponse = await fetch(`${API_BASE}/api/payments/razorpay/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numericAmount,
          currency: "INR",
          purpose,
        }),
      });

      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setError(orderData.message || "Failed to create payment order.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.key_id || RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Food Donation",
        description: purpose || "Food donation",
        order_id: orderData.order_id,
        prefill: {
          name: auth?.user?.name || "",
          email: auth?.user?.email || "",
        },
        theme: {
          color: "#1d4ed8",
        },
        handler: async function (response) {
          const verifyResponse = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: orderData.amount,
              currency: orderData.currency,
              purpose,
            }),
          });

          const verifyData = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok) {
            setError(verifyData.message || "Payment was captured, but verification failed.");
            return;
          }

          setStatus(`Donation of ₹${Number(amount).toFixed(2)} completed successfully.`);
          setShowSuccessGif(true);
          setAmount(500);
          setPurpose("Food donation");
          // keep the gif briefly visible then close
          setTimeout(() => {
            setShowSuccessGif(false);
            if (typeof onDone === "function") onDone();
          }, 1800);
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });

      razorpay.on("payment.failed", (response) => {
        setError(response?.error?.description || "Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-scroll">
      {error && <div className="form-error-box">{error}</div>}
      {status && <div className="form-success-box">{status}</div>}

      <div className="form-group">
        <label>Donation Amount (₹) *</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[100, 250, 500, 1000].map((v) => (
            <button
              key={v}
              type="button"
              className="nav-button"
              onClick={() => setAmount(v)}
              aria-label={`Donate ${v} rupees`}
              style={{ padding: '8px 12px', borderRadius: 8 }}
            >
              ₹{v}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount (e.g., 500)"
          required
        />
      </div>

      <div className="form-group">
        <label>Purpose</label>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g., Food donation"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="button-indigo" disabled={submitting}>
          {submitting ? "Opening checkout…" : "Donate with Razorpay"}
        </button>
      </div>

      {showSuccessGif && (
        <div className="gif-overlay">
          <img src={PAYMENT_GIF_SRC} alt="Payment successful" className="submission-gif" />
        </div>
      )}
    </form>
  );
}