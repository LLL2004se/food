const mongoose = require("mongoose");

const NgoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  profile_picture: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  description: { type: String },
  website: { type: String },
  registration_number: { type: String },
  area_of_service: [{ type: String }],
  bio: { type: String },
  approval_status: {
    type: String,
    enum: ["pending", "active", "rejected"],
    default: "pending"
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, { timestamps: true, collection: "ngo" });

module.exports = mongoose.model("NGO", NgoSchema);
