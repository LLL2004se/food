const mongoose = require("mongoose");
require("dotenv").config();

// Use MongoDB connection string from environment variable if provided,
// otherwise fall back to a local MongoDB instance.
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_donation_db";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
