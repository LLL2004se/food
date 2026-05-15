const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema({
  donor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ngo_id: { type: mongoose.Schema.Types.ObjectId, ref: "NGO" }, // Optional - for NGO-specific donations
  food_name: { type: String, required: true },
  food_type: { type: String, enum: ["vegetables", "fruits", "cooked", "bakery", "dairy", "packaged", "other"], default: "other" },
  quantity: { type: Number, required: true }, // servings or KG
  expiry_time: { type: Date },
  address: { type: String, required: true },
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ["pending", "assigned", "completed", "rejected"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Donation", DonationSchema);
