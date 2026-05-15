const express = require("express");
const router = express.Router();
const User = require("../models/user");
const NGO = require("../models/ngo");
const Donation = require("../models/donations");
const Pickup = require("../models/pickup");
const Request = require("../models/request");
const Notification = require("../models/notification");

// Mounted at /api/admin in server.js, so this becomes /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ user_type: "donor" });
    const totalVolunteers = await User.countDocuments({ user_type: "volunteer" });

    const totalDonations = await Donation.countDocuments();
    const pendingDonations = await Donation.countDocuments({ status: "pending" });
    const completedDonations = await Donation.countDocuments({ status: "completed" });

    const totalRequests = await Request.countDocuments();
    const totalPickups = await Pickup.countDocuments();
    const activePickups = await Pickup.countDocuments({ status: { $ne: "delivered" } });
    
    // Tracking metrics
    const completedDeliveries = await Pickup.countDocuments({ status: "delivered" });
    const activeDeliveries = await Pickup.countDocuments({ 
      status: { $in: ["assigned", "scheduled", "picked"] } 
    });

    // Calculate average delivery time (from picked_at to delivered_at)
    const deliveredPickups = await Pickup.find({ 
      status: "delivered",
      picked_at: { $exists: true, $ne: null },
      delivered_at: { $exists: true, $ne: null }
    });

    let averageDeliveryTime = 0;
    if (deliveredPickups.length > 0) {
      const totalTime = deliveredPickups.reduce((sum, pickup) => {
        const pickupTime = new Date(pickup.picked_at).getTime();
        const deliveryTime = new Date(pickup.delivered_at).getTime();
        return sum + (deliveryTime - pickupTime);
      }, 0);
      averageDeliveryTime = Math.round(totalTime / deliveredPickups.length / (1000 * 60 * 60)); // in hours
    }

    res.json({
      totalUsers,
      totalDonors,
      totalVolunteers,
      totalDonations,
      pendingDonations,
      completedDonations,
      totalRequests,
      totalPickups,
      activePickups,
      completedDeliveries,
      activeDeliveries,
      averageDeliveryTime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pickups with optional filtering
router.get("/pickups", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== "all" ? { status } : {};
    const pickups = await Pickup.find(query)
      .populate("donation_id", "donor_id quantity food_type")
      .populate("volunteer_id", "name email phone_number")
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all requests with optional filtering
router.get("/requests", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== "all" ? { status } : {};
    const requests = await Request.find(query)
      .populate("requester_id", "name email organization phone_number")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all donations for admin analytics and reports
router.get("/donations", async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate("donor_id", "name email")
      .populate("ngo_id", "name")
      .sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get NGO requests (registrations pending approval)
router.get("/ngo-requests", async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status && status !== "all") {
      query.approval_status = status;
    }
    
    console.log("Fetching NGO requests with query:", query);
    
    const ngoRequests = await NGO.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    
    console.log(`Found ${ngoRequests.length} NGO requests`);
    res.json(ngoRequests);
  } catch (err) {
    console.error("Error fetching NGO requests:", err);
    res.status(500).json({ error: err.message });
  }
});

// Approve NGO registration
router.put("/ngo-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    
    const ngo = await NGO.findByIdAndUpdate(
      id,
      { approval_status: "active" },
      { new: true }
    ).select("-password");
    
    if (!ngo) {
      return res.status(404).json({ error: "NGO not found" });
    }
    
    res.json({ message: "NGO approved successfully", ngo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject NGO registration
router.put("/ngo-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    
    const ngo = await NGO.findByIdAndUpdate(
      id,
      { approval_status: "rejected" },
      { new: true }
    ).select("-password");
    
    if (!ngo) {
      return res.status(404).json({ error: "NGO not found" });
    }

    res.json({ message: "NGO request rejected", ngo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get specific user details including hashed password
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
      organization: user.organization,
      address: user.address,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USER UPDATE & DELETE ==========
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, phone, user_type } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, user_type },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DONATION UPDATE & DELETE ==========
router.put("/donations/:id", async (req, res) => {
  try {
    const { food_name, quantity, status, address } = req.body;
    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { food_name, quantity, status, address },
      { new: true, runValidators: true }
    );
    if (!donation) return res.status(404).json({ error: "Donation not found" });
    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/donations/:id", async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) return res.status(404).json({ error: "Donation not found" });
    res.json({ message: "Donation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REQUEST UPDATE & DELETE ==========
router.put("/requests/:id", async (req, res) => {
  try {
    const { requested_quantity, priority, status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { requested_quantity, priority, status },
      { new: true, runValidators: true }
    );
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/requests/:id", async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PICKUP UPDATE & DELETE ==========
router.put("/pickups/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === "picked") updateData.picked_at = new Date();
    if (status === "delivered") updateData.delivered_at = new Date();
    const pickup = await Pickup.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("donation_id", "food_type quantity").populate("volunteer_id", "name email");
    if (!pickup) return res.status(404).json({ error: "Pickup not found" });
    res.json(pickup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/pickups/:id", async (req, res) => {
  try {
    const pickup = await Pickup.findByIdAndDelete(req.params.id);
    if (!pickup) return res.status(404).json({ error: "Pickup not found" });
    res.json({ message: "Pickup deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NGO DELETE ==========
router.delete("/ngo-requests/:id", async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndDelete(req.params.id);
    if (!ngo) return res.status(404).json({ error: "NGO not found" });
    res.json({ message: "NGO deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NOTIFICATION DELETE ==========
router.delete("/notifications/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { $set: { read: true } }
    );
    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount || result.nModified || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;