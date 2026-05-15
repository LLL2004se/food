const User = require("../models/user");
const NGO = require("../models/ngo");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

async function geocodeAddress(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "jsonv2",
        limit: 1,
      },
      headers: {
        "User-Agent": "food-rescue-app/1.0",
      },
      timeout: 7000,
    });

    const result = Array.isArray(response.data) ? response.data[0] : null;
    if (!result) return null;

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error("Address geocoding failed:", err.message);
    return null;
  }
}

function normalizeAddress(address, location) {
  const addressObject = address && typeof address === "object" ? { ...address } : {};
  if (typeof address === "string") {
    addressObject.full_address = address.trim();
  } else if (!addressObject.full_address) {
    const parts = [addressObject.building, addressObject.block, addressObject.road, addressObject.state]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);

    if (parts.length > 0) {
      addressObject.full_address = parts.join(", ");
    }
  }

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    addressObject.lat = lat;
    addressObject.lng = lng;
  }

  return addressObject;
}

function buildGoogleName(payload) {
  const displayName = String(payload?.name || "").trim();
  if (displayName) return displayName;

  const givenName = String(payload?.given_name || "").trim();
  const familyName = String(payload?.family_name || "").trim();
  const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  const email = String(payload?.email || "").trim();
  if (email.includes("@")) {
    return email.split("@")[0];
  }

  return "Google User";
}

async function verifyGoogleCredential(credential) {
  const response = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: { id_token: credential },
    timeout: 7000,
  });

  const payload = response.data || {};
  if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
    const error = new Error("Google token audience mismatch");
    error.code = "GOOGLE_AUD_MISMATCH";
    throw error;
  }

  if (String(payload.email_verified).toLowerCase() !== "true") {
    const error = new Error("Google account email is not verified");
    error.code = "GOOGLE_EMAIL_UNVERIFIED";
    throw error;
  }

  if (!payload.email) {
    const error = new Error("Google token did not include an email address");
    error.code = "GOOGLE_EMAIL_MISSING";
    throw error;
  }

  return payload;
}

exports.login = async (req, res) => {
  try {
    const { email, password, user_type } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const emailStr = email.trim().toLowerCase();

    // Check NGO collection if user_type is ngo
    if (user_type === "ngo") {
      const ngo = await NGO.findOne({ email: emailStr });
      if (!ngo)
        return res.status(400).json({ message: "Invalid email" });

      if (!ngo.password)
        return res.status(400).json({ message: "Invalid account. Please register again." });

      // Check if NGO is pending approval
      if (ngo.approval_status === "pending") {
        return res.status(403).json({ message: "Your NGO registration is pending admin approval. You will be notified once approved." });
      }

      // Check if NGO was rejected
      if (ngo.approval_status === "rejected") {
        return res.status(403).json({ message: "Your NGO registration was rejected. Please contact support." });
      }

      const isMatch = await bcrypt.compare(password, ngo.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid password" });

      const token = jwt.sign(
        { id: ngo._id, role: "ngo" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: ngo._id,
          name: ngo.name,
          role: "ngo",
          email: ngo.email
        }
      });
    }

    // Check User collection for other user types
    const user = await User.findOne({ email: { $regex: new RegExp(`^${emailStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });
    if (!user)
      return res.status(400).json({ message: "Invalid email" });

    if (!user.password)
      return res.status(400).json({ message: "Invalid account. Please register again." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.user_type },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.user_type,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const credential = String(req.body?.credential || "").trim();
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google login is not configured on the server" });
    }

    const payload = await verifyGoogleCredential(credential);
    const email = String(payload.email).trim().toLowerCase();
    const name = buildGoogleName(payload);
    const picture = String(payload.picture || "").trim();

    const existingNgo = await NGO.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });
    if (existingNgo) {
      return res.status(403).json({ message: "This email is registered as an NGO. Please use NGO login." });
    }

    let user = await User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });

    if (!user) {
      user = new User({
        name,
        email,
        user_type: "donor",
        password: undefined,
        profile_picture: picture || undefined,
        approval_status: "active",
      });
      await user.save();
    } else if (user.user_type === "admin") {
      return res.status(403).json({ message: "Google login is not allowed for admin accounts." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.user_type },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name || name,
        role: user.user_type,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Google login error:", err.code || err.message);
    if (err.code === "GOOGLE_AUD_MISMATCH") {
      return res.status(401).json({ message: "Google sign-in client ID mismatch" });
    }
    if (err.code === "GOOGLE_EMAIL_UNVERIFIED") {
      return res.status(401).json({ message: "Google account email is not verified" });
    }
    if (err.code === "GOOGLE_EMAIL_MISSING") {
      return res.status(401).json({ message: "Google account did not provide an email" });
    }
    return res.status(401).json({ message: "Google login failed" });
  }
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      user_type,
      phone,
      address,
      location,
      ngo_registration_number,
      ngo_website,
      ngo_services,
      volunteer_skills,
      volunteer_experience,
      volunteer_availability
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle NGO registration separately
    if (user_type === "ngo") {
      const existingNgo = await NGO.findOne({ email: normalizedEmail });
      if (existingNgo)
        return res.status(400).json({ message: "NGO already registered" });

      const geocodedLocation = await geocodeAddress(address);
      const normalizedAddress = normalizeAddress(address, geocodedLocation || location);

      const ngo = new NGO({
        name,
        email: normalizedEmail,
        phone,
        address: address?.building || address?.road || address || "",
        location: geocodedLocation || location,
        password: hashedPassword,
        website: ngo_website,
        registration_number: ngo_registration_number,
        description: ngo_services,
        approval_status: "pending"
      });

      await ngo.save();
      return res.status(201).json({ message: "NGO Registered Successfully. Pending admin approval.", ngoId: ngo._id });
    }

    // Handle other user types (donor, volunteer, admin)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const geocodedLocation = await geocodeAddress(address);
    const normalizedAddress = normalizeAddress(address, geocodedLocation || location);

    const user = new User({
      name,
      email: normalizedEmail,
      phone,
      address: normalizedAddress,
      location: geocodedLocation || location,
      password: hashedPassword,
      user_type,
      // Volunteer specific fields
      volunteer_skills,
      volunteer_experience,
      volunteer_availability,
      approval_status: "active"
    });

    await user.save();
    res.status(201).json({ message: "User Registered", userId: user._id });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
