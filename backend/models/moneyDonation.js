const mongoose = require("mongoose");

const MoneyDonationSchema = new mongoose.Schema({
  donor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  purpose: { type: String, default: "Food donation" },
  order_id: { type: String, required: true, unique: true },
  payment_id: { type: String, required: true, unique: true },
  signature: { type: String, required: true },
  status: { type: String, enum: ["created", "paid", "failed"], default: "paid" },
}, { timestamps: true });

module.exports = mongoose.model("MoneyDonation", MoneyDonationSchema);