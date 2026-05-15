require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const notificationPreferenceRoutes = require("./routes/notificationPreferenceRoutes");
const exportRoutes = require("./routes/exportRoutes");
const { requireAuth, optionalAuth, requireAdmin } = require("./middleware/auth");
const { createNotification } = require("./utils/notificationHelper");
const User = require("./models/user");
const Donation = require("./models/donations");
const Request = require("./models/request");
const Pickup = require("./models/pickup");
const Notification = require("./models/notification");
const NGO = require("./models/ngo");
const MoneyDonation = require("./models/moneyDonation");

const razorpayClient = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

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

function normalizeDonationFoodType(foodType) {
  const value = String(foodType || "").trim().toLowerCase();
  if (value === "beverages") return "other";
  if (["vegetables", "fruits", "cooked", "bakery", "dairy", "packaged", "other"].includes(value)) {
    return value;
  }
  return "other";
}

function calculateHaversineDistanceKm(fromLat, fromLng, toLat, toLng) {
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const HEATMAP_DATA_PATH = path.resolve(__dirname, "../Ai/heatmap_dataset.csv");
const HEATMAP_AREA_COORDINATES = {
  Andheri: [19.1136, 72.8697],
  "Andheri West": [19.1197, 72.8468],
  "Andheri East": [19.1136, 72.8697],
  Dadar: [19.0178, 72.8478],
  Kurla: [19.0726, 72.8845],
  Bandra: [19.0596, 72.8295],
  Borivali: [19.2307, 72.8567],
  Thane: [19.2183, 72.9781],
  Mulund: [19.1726, 72.9563],
  Powai: [19.1176, 72.9060],
  Goregaon: [19.1663, 72.8526],
  Malad: [19.1874, 72.8484],
  Kandivali: [19.2048, 72.8527],
  Jogeshwari: [19.1364, 72.8490],
  "Vile Parle": [19.0968, 72.8517],
  Santacruz: [19.0841, 72.8410],
  Khar: [19.0724, 72.8363],
  Churchgate: [18.9352, 72.8274],
  CST: [18.9398, 72.8355],
  Worli: [19.0176, 72.8153],
  "Lower Parel": [18.9930, 72.8310],
  Chembur: [19.0522, 72.8994],
  Ghatkopar: [19.0860, 72.9080],
  "Ghatkopar Mumbai": [19.0860, 72.9080],
  Vikhroli: [19.1096, 72.9275],
  Sion: [19.0410, 72.8640],
  Wadala: [19.0177, 72.8675],
  "Navi Mumbai": [19.0330, 73.0297],
  Panvel: [18.9894, 73.1175],
  unknown: [19.0760, 72.8777],
};

function parseCsvRows(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [area, demandScore] = line.split(",");
      return {
        area: area ? area.trim() : "unknown",
        demand_score: Number.parseFloat(demandScore),
      };
    })
    .filter((row) => Number.isFinite(row.demand_score));
}

function buildLocalHeatmapData() {
  if (!fs.existsSync(HEATMAP_DATA_PATH)) {
    throw new Error("Heatmap dataset not found. Run train_heatmap_model.py first.");
  }

  const csvText = fs.readFileSync(HEATMAP_DATA_PATH, "utf8");
  return parseCsvRows(csvText).map((row) => {
    const coords = HEATMAP_AREA_COORDINATES[row.area] || HEATMAP_AREA_COORDINATES.unknown;
    return {
      area: row.area,
      lat: coords[0],
      lng: coords[1],
      demand_score: row.demand_score,
    };
  });
}

const app = express();
require("./db");

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { message: "Too many attempts. Please try again later." },
});
app.use("/api/auth", authLimiter, authRoutes);

// Protected admin routes — require auth + admin role
app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contact", contactRoutes);

// New feature routes
app.use("/api/reviews", reviewRoutes);
app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/export", requireAuth, requireAdmin, exportRoutes);

// User notifications
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user_id: req.userId, read: false },
      { $set: { read: true } }
    );
    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount || result.nModified || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Donations (user-facing, connected to DB) -----
// GET /api/donations – list donations for a user (?user_id=...) or for authenticated user
app.get("/api/donations", optionalAuth, async (req, res) => {
  try {
    let donorId = req.userId;
    if (req.query.user_id) donorId = req.query.user_id;
    if (!donorId) {
      return res.json([]);
    }
    const donations = await Donation.find({ donor_id: donorId }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/donations – create a donation (auth required)
app.post("/api/donations", requireAuth, async (req, res) => {
  try {
    const { food_name, food_type, quantity, expiry_time, address, location, ngo_id, ngo_ids } = req.body;
    
    // Support both single ngo_id and multiple ngo_ids for backward compatibility
    const selectedNgoIds = ngo_ids && Array.isArray(ngo_ids) ? ngo_ids : (ngo_id ? [ngo_id] : []);
    
    if (!food_name || quantity == null || !address) {
      return res.status(400).json({ message: "food_name, quantity, and address are required" });
    }

    const geocodedLocation = await geocodeAddress(address);
    const resolvedLocation = geocodedLocation || (location && location.lat != null && location.lng != null
      ? { lat: Number(location.lat), lng: Number(location.lng) }
      : undefined);

    async function buildPickupLocationFields(ngoId) {
      const ngoRecord = await NGO.findById(ngoId).select("name address location").catch(() => null);
      return {
        ngoAddress: ngoRecord?.address || ngoRecord?.name || undefined,
        ngoLatitude: ngoRecord?.location?.lat,
        ngoLongitude: ngoRecord?.location?.lng,
      };
    }
    
    // If NGOs are selected, verify they exist
    if (selectedNgoIds.length > 0) {
      const ngos = await NGO.find({ _id: { $in: selectedNgoIds } });
      if (ngos.length !== selectedNgoIds.length) {
        return res.status(404).json({ message: "One or more NGOs not found" });
      }
      
      // Create donation records for each selected NGO
      const donations = [];
      for (const ngoId of selectedNgoIds) {
        const pickupLocationFields = await buildPickupLocationFields(ngoId);
        const donation = new Donation({
          donor_id: req.userId,
          ngo_id: ngoId,
          food_name: String(food_name).trim(),
          food_type: normalizeDonationFoodType(food_type),
          quantity: Number(quantity),
          expiry_time: expiry_time ? new Date(expiry_time) : undefined,
          address: String(address).trim(),
          location: resolvedLocation,
          status: "pending",
        });
        await donation.save();
        donations.push(donation);
      }

      const donor = await User.findById(req.userId).select("name");
      await createNotification(
        req.userId,
        `Your donation request for ${String(food_name).trim()} has been submitted and sent to ${donations.length} NGO(s).`
      );

      const admins = await User.find({ user_type: "admin" }).select("_id");
      await Promise.all(admins.map((admin) =>
        createNotification(
          admin._id,
          `New donation request: ${String(food_name).trim()} from ${donor?.name || "a donor"}.`
        )
      ));
      
      res.status(201).json({
        message: `Donation requests created for ${donations.length} NGO(s)`,
        donations: donations
      });
    } else {
      // Create a general donation (no specific NGO)
      const donation = new Donation({
        donor_id: req.userId,
        food_name: String(food_name).trim(),
        food_type: normalizeDonationFoodType(food_type),
        quantity: Number(quantity),
        expiry_time: expiry_time ? new Date(expiry_time) : undefined,
        address: String(address).trim(),
        location: resolvedLocation,
        status: "pending",
      });
      await donation.save();

      const pickupLocationFields = await buildPickupLocationFields(null);

      const donor = await User.findById(req.userId).select("name");
      await createNotification(
        req.userId,
        `Your donation ${String(food_name).trim()} has been posted successfully.`
      );

      const admins = await User.find({ user_type: "admin" }).select("_id");
      await Promise.all(admins.map((admin) =>
        createNotification(
          admin._id,
          `New public donation posted: ${String(food_name).trim()} from ${donor?.name || "a donor"}.`
        )
      ));
      
      res.status(201).json({
        message: "General donation created successfully",
        donations: [donation]
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments/razorpay/order", requireAuth, async (req, res) => {
  try {
    if (!razorpayClient) {
      return res.status(500).json({ message: "Razorpay is not configured on the server" });
    }

    const amountValue = Number(req.body.amount);
    const currency = String(req.body.currency || "INR").toUpperCase();
    const purpose = String(req.body.purpose || "Food donation").trim();

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: "Please enter a valid donation amount" });
    }

    const amountInPaise = Math.round(amountValue * 100);
    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `don_${Date.now()}`,
      notes: {
        purpose,
        donor_id: String(req.userId),
      },
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      purpose,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create Razorpay order" });
  }
});

app.post("/api/payments/razorpay/verify", requireAuth, async (req, res) => {
  try {
    if (!razorpayClient) {
      return res.status(500).json({ message: "Razorpay is not configured on the server" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency = "INR",
      purpose = "Food donation",
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const normalizedAmount = Number(amount);
    const donationAmount = Number.isFinite(normalizedAmount) ? normalizedAmount / 100 : 0;

    const existingDonation = await MoneyDonation.findOne({ payment_id: razorpay_payment_id });
    if (existingDonation) {
      return res.json({ message: "Payment already verified", donation: existingDonation });
    }

    const donation = await MoneyDonation.create({
      donor_id: req.userId,
      amount: donationAmount,
      currency,
      purpose: String(purpose).trim(),
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
      status: "paid",
    });

    const donor = await User.findById(req.userId).select("name");
    await createNotification(
      req.userId,
      `Thanks for your donation of ₹${donationAmount.toFixed(2)}${purpose ? ` for ${String(purpose).trim()}` : ""}.`
    );

    const admins = await User.find({ user_type: "admin" }).select("_id");
    await Promise.all(admins.map((admin) =>
      createNotification(
        admin._id,
        `Money donation received from ${donor?.name || "a donor"}: ₹${donationAmount.toFixed(2)}.`
      )
    ));

    res.status(201).json({
      message: "Payment verified successfully",
      donation,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to verify Razorpay payment" });
  }
});

// ----- NGO Routes -----
// NGO: list pickups for authenticated NGO
app.get("/api/ngo/pickups", requireAuth, async (req, res) => {
  try {
    const ngoDonations = await Donation.find({ ngo_id: req.userId }).select("_id");
    const donationIds = ngoDonations.map(d => d._id);

    const pickups = await Pickup.find({
      $or: [
        { ngo_id: req.userId },
        { donation_id: { $in: donationIds } },
        { ngo_id: { $exists: false } }
      ]
    })
      .populate({
        path: "donation_id",
        select: "food_name quantity address location expiry_time createdAt donor_id",
        populate: {
          path: "donor_id",
          select: "name email phone address"
        }
      })
      .populate("volunteer_id", "name email phone current_location")
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ngos – list all active NGOs
app.get("/api/ngos", async (req, res) => {
  try {
    const ngos = await NGO.find({ $or: [{ status: "active" }, { status: { $exists: false } }] }).sort({ name: 1 });
    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- General Donations (Home page) -----
// GET /api/donations/general – list all pending general donations (not targeted to specific NGOs)
app.get("/api/donations/general", async (req, res) => {
  try {
    const donations = await Donation.find({ 
      status: "pending",
      ngo_id: { $exists: false }  // Only donations without specific NGO
    })
      .populate("donor_id", "name email phone address location")
      .sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/donations/recent-public – list recent public donations for the home page
app.get("/api/donations/recent-public", async (req, res) => {
  try {
    const donations = await Donation.find({
      ngo_id: { $exists: false }
    })
      .populate("donor_id", "name email phone address location")
      .sort({ createdAt: -1 })
      .limit(4);
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Money Donations (frontend display) -----
// GET /api/money-donations/recent-public – recent money donations for homepage
app.get("/api/money-donations/recent-public", async (req, res) => {
  try {
    const donations = await MoneyDonation.find({})
      .populate("donor_id", "name")
      .sort({ createdAt: -1 })
      .limit(6);
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/money-donations – list money donations for a user (auth required)
app.get("/api/money-donations", requireAuth, async (req, res) => {
  try {
    const donorId = req.query.user_id || req.userId;
    if (!donorId) return res.json([]);
    const donations = await MoneyDonation.find({ donor_id: donorId }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Home Page Events -----
// GET /api/events – lightweight homepage carousel data
app.get("/api/events", async (req, res) => {
  res.json([
    {
      title: "Community Food Drive",
      description: "Join local volunteers in collecting and distributing meals to families in need.",
      imageUrl: "/welcome-food.jpg",
    },
    {
      title: "School Nutrition Support",
      description: "Support weekly food packs for students so they can focus on learning.",
      imageUrl: "/download1.jpeg",
    },
    {
      title: "Weekend Relief Camp",
      description: "Help prepare and deliver fresh meals to shelters and community centers.",
      imageUrl: "/download2.jpg",
    },
  ]);
});

// ----- NGO Dashboard Stats -----
app.get("/api/ngo/dashboard-stats", requireAuth, async (req, res) => {
  try {
    const ngoId = req.userId;

    // All donations relevant to this NGO (assigned to them or general)
    const allDonations = await Donation.find({
      $or: [
        { ngo_id: ngoId },
        { ngo_id: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });

    const pending = allDonations.filter(d => d.status === "pending").length;
    const assigned = allDonations.filter(d => d.status === "assigned").length;
    const completed = allDonations.filter(d => d.status === "completed").length;

    // Total meals (quantity sum)
    const totalMeals = allDonations.reduce((sum, d) => sum + (d.quantity || 0), 0);

    // Pickups for this NGO
    const ngoDonationIds = allDonations.map(d => d._id);
    const pickups = await Pickup.find({
      $or: [
        { ngo_id: ngoId },
        { donation_id: { $in: ngoDonationIds } }
      ]
    });
    const activePickups = pickups.filter(p => !["delivered"].includes(p.status)).length;
    const completedPickups = pickups.filter(p => p.status === "delivered").length;

    // Recent 5 donations
    const recentDonations = await Donation.find({
      $or: [
        { ngo_id: ngoId },
        { ngo_id: { $exists: false } }
      ]
    })
      .populate("donor_id", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // Expiring soon (within 6 hours)
    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const expiringSoon = allDonations.filter(d =>
      d.status === "pending" && d.expiry_time && new Date(d.expiry_time) <= sixHoursLater && new Date(d.expiry_time) > now
    ).length;

    res.json({
      stats: { pending, assigned, completed, totalMeals, activePickups, completedPickups, expiringSoon },
      recentDonations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- NGO Donations (NGO-facing) -----
// GET /api/ngo/available-donations – list all pending donations for the authenticated NGO
app.get("/api/ngo/available-donations", requireAuth, async (req, res) => {
  try {
    // Show both:
    // 1. Donations assigned specifically to this NGO
    // 2. General donations (no specific NGO assigned) available for all NGOs
    const ngo = await NGO.findById(req.userId).select("location");
    const ngoLat = Number(ngo?.location?.lat);
    const ngoLng = Number(ngo?.location?.lng);

    const donations = await Donation.find({ 
      status: { $in: ["pending", "rejected"] },
      $or: [
        { ngo_id: req.userId },           // Donations assigned to this NGO
        { ngo_id: { $exists: false } }    // General donations (no specific NGO)
      ]
    })
      .populate("donor_id", "name email phone address location")
      .populate("ngo_id", "name email phone address")
      .sort({ createdAt: -1 });

    const donationsWithDistance = await Promise.all(donations.map(async (donation) => {
      const donationLat = Number(donation.location?.lat ?? donation.donor_id?.location?.lat);
      const donationLng = Number(donation.location?.lng ?? donation.donor_id?.location?.lng);

      let distanceKm = null;
      if (Number.isFinite(ngoLat) && Number.isFinite(ngoLng) && Number.isFinite(donationLat) && Number.isFinite(donationLng)) {
        distanceKm = calculateHaversineDistanceKm(donationLat, donationLng, ngoLat, ngoLng);
      } else if (Number.isFinite(ngoLat) && Number.isFinite(ngoLng) && donation.address) {
        const geocodedDonation = await geocodeAddress(donation.address);
        if (geocodedDonation) {
          distanceKm = calculateHaversineDistanceKm(geocodedDonation.lat, geocodedDonation.lng, ngoLat, ngoLng);
        }
      }

      return {
        ...donation.toObject(),
        distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
      };
    }));

    res.json(donationsWithDistance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/donations/:id – update donation status
app.patch("/api/donations/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "assigned", "completed", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Check ownership — only donor, assigned NGO, or admin can update
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    const isOwner = donation.donor_id?.toString() === req.userId;
    const isAssignedNgo = donation.ngo_id?.toString() === req.userId;
    const isAdmin = req.userRole === "admin";
    const canClaimAsNgo =
      req.userRole === "ngo" &&
      status === "assigned" &&
      donation.status === "pending" &&
      (!donation.ngo_id || isAssignedNgo);
    const canRejectAsNgo =
      req.userRole === "ngo" &&
      status === "rejected" &&
      donation.status === "pending" &&
      (!donation.ngo_id || isAssignedNgo);

    if (!isOwner && !isAssignedNgo && !isAdmin && !canClaimAsNgo && !canRejectAsNgo) {
      return res.status(403).json({ message: "Not authorized to update this donation" });
    }

    if (canClaimAsNgo && !donation.ngo_id) {
      donation.ngo_id = req.userId;
    }

    if (canRejectAsNgo && !donation.ngo_id) {
      donation.ngo_id = req.userId;
    }

    donation.status = status;
    await donation.save();
    await donation.populate("donor_id", "name email phone address");

    if (status === "assigned") {
      const existingPickup = await Pickup.findOne({ donation_id: donation._id });
      if (!existingPickup) {
        const ngoRecord = donation.ngo_id ? await NGO.findById(donation.ngo_id).select("name address location") : null;
        await Pickup.create({
          donation_id: donation._id,
          ngo_id: donation.ngo_id || req.userId,
          pickupAddress: donation.address || undefined,
          pickupLatitude: donation.location?.lat,
          pickupLongitude: donation.location?.lng,
          ngoAddress: ngoRecord?.address || ngoRecord?.name || undefined,
          ngoLatitude: ngoRecord?.location?.lat,
          ngoLongitude: ngoRecord?.location?.lng,
          pickup_location: donation.location || undefined,
          dismissed_by: [],
          status: "pending",
          timeline: [{ status: "pending", updatedAt: new Date() }],
        });
      }
    }

    await createNotification(
      donation.donor_id?._id || donation.donor_id,
      `Your donation ${donation.food_name} status was updated to ${status}.`
    );

    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Pickups (NGO-facing) -----
// PATCH /api/pickups/:id – update pickup status
app.patch("/api/pickups/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "assigned", "scheduled", "picked", "delivered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Check ownership — only assigned volunteer, NGO, or admin can update
    let pickup = await Pickup.findById(id);
    if (!pickup) {
      return res.status(404).json({ message: "Pickup not found" });
    }
    const isVolunteer = pickup.volunteer_id?.toString() === req.userId;
    const isNgo = pickup.ngo_id?.toString() === req.userId;
    const isAdmin = req.userRole === "admin";
    if (!isVolunteer && !isNgo && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this pickup" });
    }

    // Add timestamp based on status
    const updateData = { status };
    if (status === "picked") updateData.picked_at = new Date();
    if (status === "delivered") updateData.delivered_at = new Date();

    // Add to timeline
    const timelineEntry = {
      status: status,
      updatedAt: new Date()
    };

    pickup = await Pickup.findByIdAndUpdate(
      id,
      {
        ...updateData,
        $push: { timeline: timelineEntry }
      },
      { new: true }
    ).populate("donation_id volunteer_id");

    if (!pickup) {
      return res.status(404).json({ message: "Pickup not found" });
    }

    res.json(pickup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Donor Impact Stats -----
// GET /api/donor/impact-stats – get donor's impact metrics
app.get("/api/donor/impact-stats", requireAuth, async (req, res) => {
  try {
    const donorId = req.userId;

    // All donations created by this donor
    const donations = await Donation.find({ donor_id: donorId });
    const totalDonations = donations.length;
    
    // Total meals donated
    const totalMeals = donations.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Completed donations (picked up and delivered)
    const completedDonations = donations.filter(d => d.status === "completed").length;
    
    // Get pickup data for completed donations
    const completedDonationIds = donations.filter(d => d.status === "completed").map(d => d._id);
    const completedPickups = await Pickup.find({
      donation_id: { $in: completedDonationIds },
      status: "delivered"
    });
    
    // Count unique NGOs helped
    const ngoIds = new Set(donations.map(d => d.ngo_id).filter(id => id));
    const ngosHelped = ngoIds.size;
    
    // Estimate people served (assume 1 meal serves 1 person, completed meals only)
    const completedMeals = completedPickups.reduce((sum, p) => {
      const donation = donations.find(d => d._id.toString() === p.donation_id?.toString());
      return sum + (donation?.quantity || 0);
    }, 0);
    
    // Carbon footprint saved (estimate 2kg CO2 saved per meal)
    const carbonSavedKg = completedMeals * 2;
    
    // Days as donor (since first donation)
    const firstDonation = donations.length > 0 ? new Date(donations[donations.length - 1].createdAt) : new Date();
    const daysSinceDonating = Math.max(0, Math.floor((new Date() - firstDonation) / (1000 * 60 * 60 * 24)));
    
    // Recent 5 donations
    const recentDonations = await Donation.find({ donor_id: donorId })
      .populate("ngo_id", "name")
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      stats: {
        totalDonations,
        totalMeals,
        completedDonations,
        completedMeals,
        ngosHelped,
        carbonSavedKg,
        daysSinceDonating
      },
      recentDonations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Notifications (Admin/NGO-facing) -----
// POST /api/admin/notifications – create notification
app.post("/api/admin/notifications", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, message } = req.body;
    if (!user_id || !message) {
      return res.status(400).json({ message: "user_id and message are required" });
    }

    const notification = new Notification({
      user_id,
      message,
      read: false
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- User Profile (User-facing) -----
// GET /api/user/profile – get authenticated user's profile
app.get("/api/user/profile", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/user/profile – update authenticated user's profile
app.patch("/api/user/profile", requireAuth, async (req, res) => {
  try {
    const { name, email, phone, ngo_registration_number, ngo_website, ngo_services, address, location } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (ngo_registration_number) updateData.ngo_registration_number = ngo_registration_number;
    if (ngo_website) updateData.ngo_website = ngo_website;
    if (ngo_services) updateData.ngo_services = ngo_services;
    if (address) updateData.address = address;
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      updateData.location = { lat, lng };
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Volunteer Endpoints =====

// GET /api/volunteer/dashboard-stats – volunteer overview stats
app.get("/api/volunteer/dashboard-stats", requireAuth, async (req, res) => {
  try {
    const allPickups = await Pickup.find({ volunteer_id: req.userId });

    const active = allPickups.filter(p => ["assigned", "scheduled", "picked"].includes(p.status)).length;
    const completed = allPickups.filter(p => p.status === "delivered").length;
    const totalMeals = await Pickup.aggregate([
      { $match: { volunteer_id: new (require("mongoose").Types.ObjectId)(req.userId), status: "delivered" } },
      { $lookup: { from: "donations", localField: "donation_id", foreignField: "_id", as: "donation" } },
      { $unwind: { path: "$donation", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: "$donation.quantity" } } }
    ]);

    // Average delivery time (assigned → delivered)
    const deliveredPickups = allPickups.filter(p => p.status === "delivered" && p.delivered_at && p.createdAt);
    let avgTime = null;
    if (deliveredPickups.length > 0) {
      const totalMin = deliveredPickups.reduce((sum, p) => {
        return sum + (new Date(p.delivered_at) - new Date(p.createdAt)) / 60000;
      }, 0);
      avgTime = Math.round(totalMin / deliveredPickups.length);
    }

    res.json({
      active,
      completed,
      total: allPickups.length,
      totalMeals: totalMeals[0]?.total || 0,
      avgDeliveryTime: avgTime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteer/delivery-history – completed deliveries
app.get("/api/volunteer/delivery-history", requireAuth, async (req, res) => {
  try {
    const pickups = await Pickup.find({
      volunteer_id: req.userId,
      status: "delivered"
    })
      .populate("donation_id", "food_name quantity address location expiry_time donor_id")
      .populate({
        path: "donation_id",
        populate: { path: "donor_id", select: "phone name email" }
      })
      .populate("ngo_id", "name email phone location address")
      .sort({ delivered_at: -1 });
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteer/my-pickups – get pickups assigned to authenticated volunteer
app.get("/api/volunteer/my-pickups", requireAuth, async (req, res) => {
  try {
    const pickups = await Pickup.find({
      volunteer_id: req.userId,
      status: { $in: ["assigned", "scheduled", "picked"] }
    })
      .populate("donation_id", "food_name quantity address location expiry_time donor_id")
      .populate({
        path: "donation_id",
        populate: { path: "donor_id", select: "phone name email" }
      })
      .populate("ngo_id", "name email phone location address")
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteer/available-pickups – get pickups ready to be claimed by volunteers
app.get("/api/volunteer/available-pickups", requireAuth, async (req, res) => {
  try {
    const volunteer = await User.findOne({ _id: req.userId, user_type: "volunteer" });
    if (!volunteer) {
      return res.status(403).json({ message: "Volunteer access required" });
    }

    const assignedDonations = await Donation.find({
      status: "assigned"
    }).populate("ngo_id", "name email phone location address");

    for (const donation of assignedDonations) {
      const existingPickup = await Pickup.findOne({ donation_id: donation._id });
      if (!existingPickup) {
        const ngoRecord = donation.ngo_id ? await NGO.findById(donation.ngo_id).select("name address location") : null;
        await Pickup.create({
          donation_id: donation._id,
          ngo_id: donation.ngo_id || null,
          pickupAddress: donation.address || undefined,
          pickupLatitude: donation.location?.lat,
          pickupLongitude: donation.location?.lng,
          ngoAddress: ngoRecord?.address || ngoRecord?.name || undefined,
          ngoLatitude: ngoRecord?.location?.lat,
          ngoLongitude: ngoRecord?.location?.lng,
          pickup_location: donation.location || undefined,
          dismissed_by: [],
          status: "pending",
          timeline: [{ status: "pending", updatedAt: new Date() }],
        });
      }
    }

    const pickups = await Pickup.find({
      status: "pending",
      $or: [
        { volunteer_id: { $exists: false } },
        { volunteer_id: null }
      ],
      dismissed_by: { $nin: [req.userId] }
    })
      .populate("donation_id", "food_name quantity address location expiry_time")
      .populate("ngo_id", "name email phone location address")
      .sort({ createdAt: -1 });

    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/volunteer/pickup/:id/claim – claim an available pickup
app.patch("/api/volunteer/pickup/:id/claim", requireAuth, async (req, res) => {
  try {
    const volunteer = await User.findOne({ _id: req.userId, user_type: "volunteer" });
    if (!volunteer) {
      return res.status(403).json({ message: "Volunteer access required" });
    }

    const { id } = req.params;
    const pickup = await Pickup.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
        $or: [
          { volunteer_id: { $exists: false } },
          { volunteer_id: null }
        ]
      },
      {
        volunteer_id: req.userId,
        status: "assigned",
        $push: { timeline: { status: "assigned", updatedAt: new Date() } },
      },
      { new: true }
    )
      .populate("donation_id", "food_name quantity address location expiry_time")
      .populate("ngo_id", "name email phone location address");

    if (!pickup) {
      return res.status(404).json({ message: "Pickup not found or already claimed" });
    }

    await createNotification(
      pickup.ngo_id?._id || pickup.ngo_id,
      `A volunteer has claimed pickup for ${pickup.donation_id?.food_name || "a donation"}.`
    );

    res.json({ message: "Pickup claimed successfully", pickup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/volunteer/pickup/:id/reject – dismiss an available pickup for this volunteer
app.patch("/api/volunteer/pickup/:id/reject", requireAuth, async (req, res) => {
  try {
    const volunteer = await User.findOne({ _id: req.userId, user_type: "volunteer" });
    if (!volunteer) {
      return res.status(403).json({ message: "Volunteer access required" });
    }

    const { id } = req.params;
    const pickup = await Pickup.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $addToSet: { dismissed_by: req.userId },
        $push: { timeline: { status: "rejected", updatedAt: new Date() } },
      },
      { new: true }
    ).populate("donation_id", "food_name quantity address location expiry_time")
      .populate("ngo_id", "name email phone location address");

    if (!pickup) {
      return res.status(404).json({ message: "Pickup not found or already handled" });
    }

    res.json({ message: "Pickup dismissed successfully", pickup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/volunteer/pickup/:id/deliver – mark a pickup as delivered
app.patch("/api/volunteer/pickup/:id/deliver", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pickup = await Pickup.findOneAndUpdate(
      { _id: id, volunteer_id: req.userId },
      {
        status: "delivered",
        delivered_at: new Date(),
        $push: { timeline: { status: "delivered", updatedAt: new Date() } }
      },
      { new: true }
    ).populate("donation_id").populate("ngo_id", "name");

    if (!pickup) {
      return res.status(404).json({ error: "Pickup not found or not assigned to you" });
    }

    // Also mark the donation as completed
    if (pickup.donation_id) {
      await Donation.findByIdAndUpdate(pickup.donation_id._id, { status: "completed" });
    }

    res.json({ message: "Delivery marked as complete", pickup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Location & Tracking Endpoints =====
// POST /api/volunteer/location – update volunteer's current location (real-time tracking)
app.post("/api/volunteer/location", requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === null || lng === null || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        current_location: { lat: Number(lat), lng: Number(lng) },
        location_updated_at: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json({
      message: "Location updated",
      location: user.current_location,
      updated_at: user.location_updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pickup/:id/tracking – get pickup with volunteer and donation location details
app.get("/api/pickup/:id/tracking", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pickup = await Pickup.findById(id)
      .populate("donation_id", "food_name address location donor_id")
      .populate("donation_id.donor_id", "name location address")
      .populate("volunteer_id", "name email phone current_location")
      .populate("ngo_id", "name location");

    if (!pickup) {
      return res.status(404).json({ error: "Pickup not found" });
    }

    // NGO accounts are stored in the NGO collection, while donors/users live in User.
    const ngo = req.userRole === "ngo"
      ? await NGO.findById(req.userId).select("name location")
      : await User.findById(req.userId).select("name location");

    const donorLocation = pickup.donation_id?.donor_id?.location || pickup.donation_id?.location;

    res.json({
      pickup,
      volunteer_location: pickup.volunteer_id?.current_location || { lat: 19.0760, lng: 72.8777 },
      ngoAddress: pickup.ngoAddress || ngo?.name || "NGO Location",
      ngoLatitude: pickup.ngoLatitude ?? ngo?.location?.lat ?? 19.0760,
      ngoLongitude: pickup.ngoLongitude ?? ngo?.location?.lng ?? 72.8777,
      ngo_location: {
        lat: pickup.ngoLatitude ?? ngo?.location?.lat ?? 19.0760,
        lng: pickup.ngoLongitude ?? ngo?.location?.lng ?? 72.8777,
        name: pickup.ngoAddress || ngo?.name || "NGO Location"
      },
      pickupAddress: pickup.pickupAddress || pickup.donation_id?.address || donorLocation?.full_address || null,
      pickupLatitude: pickup.pickupLatitude ?? pickup.pickup_location?.lat ?? donorLocation?.lat ?? null,
      pickupLongitude: pickup.pickupLongitude ?? pickup.pickup_location?.lng ?? donorLocation?.lng ?? null,
      pickup_location: pickup.pickup_location || donorLocation || { lat: 19.0760, lng: 72.8777 },
      donation_location: pickup.donation_id?.location || donorLocation || { lat: 19.0760, lng: 72.8777 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AI Prediction Endpoints =====
const AI_SERVER = process.env.AI_SERVER_URL || "http://localhost:5001";

function buildDemandFallback(donationCount, ngoRequests, month) {
  const donations = Number.isFinite(Number(donationCount)) ? Number(donationCount) : 0;
  const requests = Number.isFinite(Number(ngoRequests)) ? Number(ngoRequests) : 0;
  const monthValue = Number.isFinite(Number(month)) ? Number(month) : 1;
  return Math.max(0, Math.round(donations * 6 + requests * 18 + monthValue * 2 + 25));
}

function normalizeSpoilageFoodType(foodType) {
  const numeric = Number(foodType);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(6, Math.trunc(numeric)));
  }

  const value = String(foodType || "other").trim().toLowerCase();
  const lookup = {
    vegetables: 0,
    fruits: 1,
    cooked: 2,
    bakery: 3,
    dairy: 4,
    packaged: 5,
    other: 6,
  };

  return lookup[value] ?? lookup.other;
}

function calculateMinutesUntilExpiry(expiryTime) {
  if (!expiryTime) return null;

  const expiry = new Date(expiryTime);
  if (!Number.isFinite(expiry.getTime())) return null;

  return Math.max(0, (expiry - new Date()) / (1000 * 60));
}

function buildSpoilageFallback({ food_type, distance, delivery_time, temperature }) {
  const normalizedFoodType = normalizeSpoilageFoodType(food_type);
  const distanceKm = Number.isFinite(Number(distance)) ? Math.max(0, Number(distance)) : 0;
  const deliveryMinutes = Number.isFinite(Number(delivery_time)) ? Math.max(1, Number(delivery_time)) : 30;
  const tempC = Number.isFinite(Number(temperature)) ? Number(temperature) : 25;

  let risk = 0;

  if (normalizedFoodType === 2 || normalizedFoodType === 4 || normalizedFoodType === 0) {
    risk += 1;
  }

  if (normalizedFoodType === 5) {
    risk -= 1;
  }

  if (distanceKm > 20 || deliveryMinutes > 180 || tempC >= 35) {
    risk += 1;
  }

  if (distanceKm > 35 || deliveryMinutes > 240 || tempC >= 40) {
    risk += 1;
  }

  return {
    risk_level: Math.max(0, Math.min(2, Math.round(risk))),
    food_type: normalizedFoodType,
    distance: distanceKm,
    delivery_time: deliveryMinutes,
    temperature: tempC,
    fallback: true,
  };
}

// POST /api/ai/predict – predict demand based on donations and requests
app.post("/api/ai/predict-demand", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVER}/predict-demand`,
      req.body
    );
    const prediction = Number(response.data?.prediction);
    if (!Number.isFinite(prediction)) {
      const fallbackPrediction = buildDemandFallback(
        req.body?.donation_count,
        req.body?.ngo_requests,
        req.body?.month
      );

      return res.json({
        prediction: fallbackPrediction,
        donation_count: Number(req.body?.donation_count) || 0,
        ngo_requests: Number(req.body?.ngo_requests) || 0,
        month: Number(req.body?.month) || 1,
        fallback: true,
      });
    }

    res.json({
      ...response.data,
      prediction,
    });
  } catch (err) {
    const fallbackPrediction = buildDemandFallback(
      req.body?.donation_count,
      req.body?.ngo_requests,
      req.body?.month
    );

    res.json({
      prediction: fallbackPrediction,
      donation_count: Number(req.body?.donation_count) || 0,
      ngo_requests: Number(req.body?.ngo_requests) || 0,
      month: Number(req.body?.month) || 1,
      fallback: true,
      warning: "AI service unavailable, using fallback demand estimate",
    });
  }
});

// POST /api/ai/predict-location-demand – predict demand by location
app.post("/api/ai/predict-location-demand", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVER}/predict-location-demand`,
      req.body
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ 
      error: "AI service error", 
      details: err.message 
    });
  }
});

// POST /api/ai/predict-spoilage – predict food spoilage risk
app.post("/api/ai/predict-spoilage", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVER}/predict-spoilage`,
      req.body
    );
    const riskLevel = Number(response.data?.risk_level);
    if (!Number.isFinite(riskLevel)) {
      return res.json(buildSpoilageFallback(req.body || {}));
    }

    res.json({
      ...response.data,
      risk_level: riskLevel,
    });
  } catch (err) {
    res.json(buildSpoilageFallback(req.body || {}));
  }
});

// POST /api/ai/predict-spoilage-with-expiry – predict spoilage risk using donation expiry time
app.post("/api/ai/predict-spoilage-with-expiry", async (req, res) => {
  try {
    const { food_type, distance, temperature, expiry_time } = req.body || {};
    
    // Calculate delivery_time from expiry_time
    let delivery_time = 30; // Default 30 minutes
    if (expiry_time) {
      const timeDiffMinutes = calculateMinutesUntilExpiry(expiry_time) ?? 30;
      
      // Delivery time is 80% of remaining time (leave 20% buffer before spoilage)
      delivery_time = Math.min(Math.max(5, timeDiffMinutes * 0.8), 120);
    }

    const normalizedPayload = {
      food_type: normalizeSpoilageFoodType(food_type),
      distance: Number.isFinite(Number(distance)) ? Number(distance) : 0,
      delivery_time: Math.round(delivery_time),
      temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : 25,
    };

    const response = await axios.post(
      `${AI_SERVER}/predict-spoilage`,
      normalizedPayload
    );

    const riskLevel = Number(response.data?.risk_level);
    if (!Number.isFinite(riskLevel)) {
      return res.json({
        ...buildSpoilageFallback({ food_type, distance, delivery_time, temperature }),
        delivery_time: Math.round(delivery_time),
        time_until_expiry: expiry_time ? Math.max(0, (new Date(expiry_time) - new Date()) / (1000 * 60)) : null,
      });
    }

    res.json({
      ...response.data,
      delivery_time: Math.round(delivery_time),
      risk_level: riskLevel,
      time_until_expiry: calculateMinutesUntilExpiry(expiry_time)
    });
  } catch (err) {
    res.json({
      ...buildSpoilageFallback(req.body || {}),
      delivery_time: Math.round(buildSpoilageFallback(req.body || {}).delivery_time),
      time_until_expiry: calculateMinutesUntilExpiry(req.body?.expiry_time),
      warning: "AI service unavailable, using fallback spoilage estimate",
    });
  }
});

// ===== NGO Volunteer Management Endpoints =====

// GET /api/ngo/volunteers – list all volunteers with assignment stats
app.get("/api/ngo/volunteers", requireAuth, async (req, res) => {
  try {
    const volunteers = await User.find({ user_type: "volunteer" }).select("-password").sort({ createdAt: -1 });

    // Get pickup counts per volunteer
    const volunteerIds = volunteers.map(v => v._id);
    const pickups = await Pickup.find({ volunteer_id: { $in: volunteerIds } });

    const volunteersWithStats = volunteers.map(v => {
      const vPickups = pickups.filter(p => p.volunteer_id.toString() === v._id.toString());
      return {
        ...v.toObject(),
        totalPickups: vPickups.length,
        activePickups: vPickups.filter(p => !["delivered"].includes(p.status)).length,
        completedPickups: vPickups.filter(p => p.status === "delivered").length,
      };
    });

    res.json(volunteersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngo/volunteers/invite – invite (create) a new volunteer account
app.post("/api/ngo/volunteers/invite", requireAuth, async (req, res) => {
  try {
    const { name, email, phone, volunteer_skills, volunteer_availability } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const bcrypt = require("bcryptjs");
    const crypto = require("crypto");
    const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);

    const volunteer = new User({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      password: tempPassword,
      user_type: "volunteer",
      volunteer_skills: volunteer_skills ? String(volunteer_skills).trim() : undefined,
      volunteer_availability: volunteer_availability ? String(volunteer_availability).trim() : undefined,
      approval_status: "active",
    });
    await volunteer.save();

    const { password: _pw, ...volunteerData } = volunteer.toObject();
    res.status(201).json({ message: "Volunteer invited successfully", volunteer: volunteerData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ngo/volunteers/:id/status – toggle volunteer active/pending status
app.patch("/api/ngo/volunteers/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;
    if (!["active", "pending"].includes(approval_status)) {
      return res.status(400).json({ message: "Status must be active or pending" });
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: id, user_type: "volunteer" },
      { approval_status },
      { new: true }
    ).select("-password");
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }
    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngo/volunteers/:id/assign – assign volunteer to a pending pickup
app.post("/api/ngo/volunteers/:id/assign", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { pickup_id } = req.body;

    const volunteer = await User.findOne({ _id: id, user_type: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    if (pickup_id) {
      // Assign to a specific existing pickup
      const pickup = await Pickup.findByIdAndUpdate(
        pickup_id,
        {
          volunteer_id: id,
          status: "assigned",
          $push: { timeline: { status: "assigned", updatedAt: new Date() } }
        },
        { new: true }
      ).populate("donation_id", "food_name quantity address");

      if (!pickup) {
        return res.status(404).json({ message: "Pickup not found" });
      }

      // Notify the volunteer
      await new Notification({
        user_id: id,
        message: `You have been assigned to pickup: ${pickup.donation_id?.food_name || "Food Donation"} at ${pickup.donation_id?.address || "N/A"}`,
        read: false,
      }).save();

      return res.json({ message: "Volunteer assigned to pickup", pickup });
    }

    // If no pickup_id, find unassigned pickups
    const unassignedPickups = await Pickup.find({
      $or: [
        { volunteer_id: { $exists: false } },
        { status: "pending" }
      ]
    })
      .populate("donation_id", "food_name quantity address")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ message: "Available pickups for assignment", pickups: unassignedPickups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ngo/unassigned-pickups – list pickups without a volunteer
app.get("/api/ngo/unassigned-pickups", requireAuth, async (req, res) => {
  try {
    const ngoId = req.userId;
    const ngoDonations = await Donation.find({
      $or: [{ ngo_id: ngoId }, { ngo_id: { $exists: false } }],
      status: { $in: ["pending", "assigned"] }
    }).select("_id");
    const donationIds = ngoDonations.map(d => d._id);

    const assignedDonations = await Donation.find({
      status: "assigned"
    }).select("_id");

    for (const donation of assignedDonations) {
      const existingPickup = await Pickup.findOne({ donation_id: donation._id });
      if (!existingPickup) {
        const ngoRecord = await NGO.findById(ngoId).select("name address location");
        await Pickup.create({
          donation_id: donation._id,
          ngo_id: ngoId,
          pickupAddress: donation.address || undefined,
          pickupLatitude: donation.location?.lat,
          pickupLongitude: donation.location?.lng,
          ngoAddress: ngoRecord?.address || ngoRecord?.name || undefined,
          ngoLatitude: ngoRecord?.location?.lat,
          ngoLongitude: ngoRecord?.location?.lng,
          pickup_location: donation.location || undefined,
          dismissed_by: [],
          status: "pending",
          timeline: [{ status: "pending", updatedAt: new Date() }],
        });
      }
    }

    const pickups = await Pickup.find({
      donation_id: { $in: donationIds },
      $or: [
        { volunteer_id: { $exists: false } },
        { status: "pending" }
      ]
    })
      .populate("donation_id", "food_name quantity address expiry_time")
      .sort({ createdAt: -1 });

    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/heatmap-data – get heatmap data for demand visualization
app.get("/api/ai/heatmap-data", async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVER}/heatmap-data`);
    res.json(response.data);
  } catch (err) {
    try {
      res.json(buildLocalHeatmapData());
    } catch (fallbackErr) {
      res.status(500).json({ 
        error: "AI service error", 
        details: err.message,
        fallbackDetails: fallbackErr.message
      });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
