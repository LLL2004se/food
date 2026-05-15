const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  requester_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requested_quantity: { type: Number, required: true }, // servings needed
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["open", "fulfilled"], default: "open" },
}, { timestamps: true });

module.exports = mongoose.model("Request", RequestSchema);
