const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  donation_id: { type: mongoose.Schema.Types.ObjectId, ref: "Donation" },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
  review_type: { type: String, enum: ["donor", "ngo", "volunteer"], required: true },
  recipient_type: { type: String, enum: ["donor", "ngo", "volunteer"] },
}, { timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);
