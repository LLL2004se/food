const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  first_name: { type: String },
  last_name: { type: String },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String},
  password: { type: String },
  profile_picture: { type: String },
  bio: { type: String },
  user_type: { type: String, enum: ["donor", "ngo", "volunteer", "admin"], required: true },
  address: {
    full_address: String,
    building: String,
    block: String,
    road: String,
    state: String,
    lat: Number,
    lng: Number,
  },
  location: {
    lat: Number,
    lng: Number
  },
  // Real-time tracking for volunteers delivering food
  current_location: {
    lat: Number,
    lng: Number
  },
  location_updated_at: { type: Date },
  // NGO specific fields
  ngo_registration_number: { type: String },
  ngo_website: { type: String },
  ngo_services: { type: String },
  // Volunteer specific fields
  volunteer_skills: { type: String },
  volunteer_experience: { type: String },
  volunteer_availability: { type: String },
  // Approval status (pending for NGO, active for others)
  approval_status: { type: String, enum: ["pending", "active", "rejected"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
