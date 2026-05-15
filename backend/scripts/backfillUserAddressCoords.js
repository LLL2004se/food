const mongoose = require("mongoose");
const User = require("../models/user");
require("dotenv").config();

async function backfillUserAddressCoords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_donation_db");
    console.log("✓ MongoDB connected");

    const users = await User.find({
      location: { $exists: true, $ne: null },
      $or: [
        { "address.lat": { $exists: false } },
        { "address.lng": { $exists: false } },
      ],
    }).select("address location");

    let updatedCount = 0;

    for (const user of users) {
      const lat = Number(user.location?.lat);
      const lng = Number(user.location?.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      const address = user.address && typeof user.address === "object"
        ? { ...user.address }
        : { full_address: typeof user.address === "string" ? user.address : "" };

      address.lat = lat;
      address.lng = lng;

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            address,
          },
        }
      );

      updatedCount += 1;
    }

    console.log(`✓ Backfilled coordinates for ${updatedCount} user profile(s)`);
    await mongoose.connection.close();
    console.log("✓ Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

backfillUserAddressCoords();