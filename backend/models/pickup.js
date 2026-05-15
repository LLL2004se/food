const mongoose = require("mongoose");

const PickupSchema = new mongoose.Schema({
  donation_id: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
  volunteer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ngo_id: { type: mongoose.Schema.Types.ObjectId, ref: "NGO" },
  pickupAddress: { type: String },
  pickupLatitude: { type: Number },
  pickupLongitude: { type: Number },
  ngoAddress: { type: String },
  ngoLatitude: { type: Number },
  ngoLongitude: { type: Number },
  pickup_location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  dismissed_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  picked_at: { type: Date },
  delivered_at: { type: Date },
  status: {
    type: String,
    enum: ["pending", "assigned", "scheduled", "picked", "delivered"],
    default: "pending"
  },
  timeline: [
    {
      status: { type: String },
      updatedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Pickup", PickupSchema);
