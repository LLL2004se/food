const express = require("express");
const router = express.Router();
const NotificationPreference = require("../models/notificationPreference");
const { requireAuth } = require("../middleware/auth");

// Get user's notification preferences
router.get("/", requireAuth, async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user_id: req.userId });
    
    if (!prefs) {
      prefs = new NotificationPreference({ user_id: req.userId });
      await prefs.save();
    }

    res.json({ preferences: prefs });
  } catch (error) {
    res.status(500).json({ message: "Error fetching preferences", error: error.message });
  }
});

// Update notification preferences
router.patch("/", requireAuth, async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user_id: req.userId });
    
    if (!prefs) {
      prefs = new NotificationPreference({ user_id: req.userId });
    }

    const { email_enabled, sms_enabled, in_app_enabled, frequency, donation_updates, pickup_alerts, ngo_messages, volunteer_updates } = req.body;
    
    if (email_enabled !== undefined) prefs.email_enabled = email_enabled;
    if (sms_enabled !== undefined) prefs.sms_enabled = sms_enabled;
    if (in_app_enabled !== undefined) prefs.in_app_enabled = in_app_enabled;
    if (frequency) prefs.frequency = frequency;
    if (donation_updates !== undefined) prefs.donation_updates = donation_updates;
    if (pickup_alerts !== undefined) prefs.pickup_alerts = pickup_alerts;
    if (ngo_messages !== undefined) prefs.ngo_messages = ngo_messages;
    if (volunteer_updates !== undefined) prefs.volunteer_updates = volunteer_updates;

    await prefs.save();
    res.json({ message: "Preferences updated", preferences: prefs });
  } catch (error) {
    res.status(500).json({ message: "Error updating preferences", error: error.message });
  }
});

module.exports = router;
