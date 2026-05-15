const mongoose = require("mongoose");

const NotificationPreferenceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  email_enabled: { type: Boolean, default: true },
  sms_enabled: { type: Boolean, default: false },
  in_app_enabled: { type: Boolean, default: true },
  frequency: { type: String, enum: ["realtime", "daily", "weekly"], default: "realtime" },
  donation_updates: { type: Boolean, default: true },
  pickup_alerts: { type: Boolean, default: true },
  ngo_messages: { type: Boolean, default: true },
  volunteer_updates: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("NotificationPreference", NotificationPreferenceSchema);
