const mongoose = require("mongoose");
const Pickup = require("../models/pickup");
const Donation = require("../models/donations");
const NGO = require("../models/ngo");
const User = require("../models/user");
require("dotenv").config();

async function backfillPickupLocations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food_donation_db");
    console.log("✓ MongoDB connected");

    const pickups = await Pickup.find({
      $or: [
        { pickupAddress: { $exists: false } },
        { pickupLatitude: { $exists: false } },
        { pickupLongitude: { $exists: false } },
        { ngoAddress: { $exists: false } },
        { ngoLatitude: { $exists: false } },
        { ngoLongitude: { $exists: false } },
        { pickup_location: { $exists: false } },
        { pickup_location: null },
      ],
    }).select("donation_id ngo_id pickupAddress pickupLatitude pickupLongitude ngoAddress ngoLatitude ngoLongitude pickup_location");

    let updatedCount = 0;
    let skippedCount = 0;

    for (const pickup of pickups) {
      const donation = await Donation.findById(pickup.donation_id).select("location address ngo_id");
      const ngoLookupId = pickup.ngo_id || donation?.ngo_id;
      const ngoRecord = ngoLookupId
        ? (await NGO.findById(ngoLookupId).select("name address location").catch(() => null)
          || await User.findById(ngoLookupId).select("name address location").catch(() => null))
        : null;
      const lat = Number(donation?.location?.lat);
      const lng = Number(donation?.location?.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        skippedCount += 1;
        continue;
      }

      const pickupAddress = typeof donation?.address === "string"
        ? donation.address.trim()
        : "";

      const ngoLat = Number(ngoRecord?.location?.lat);
      const ngoLng = Number(ngoRecord?.location?.lng);
      const ngoAddress = ngoRecord?.address || ngoRecord?.name || "";

      await Pickup.updateOne(
        { _id: pickup._id },
        {
          $set: {
            pickupAddress: pickupAddress || undefined,
            pickupLatitude: lat,
            pickupLongitude: lng,
            ngoAddress: ngoAddress || undefined,
            ngoLatitude: Number.isFinite(ngoLat) ? ngoLat : undefined,
            ngoLongitude: Number.isFinite(ngoLng) ? ngoLng : undefined,
            pickup_location: { lat, lng },
          },
        }
      );

      updatedCount += 1;
    }

    console.log(`✓ Backfilled pickup coordinates for ${updatedCount} pickup(s)`);
    console.log(`✓ Skipped ${skippedCount} pickup(s) without valid donation coordinates`);

    await mongoose.connection.close();
    console.log("✓ Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

backfillPickupLocations();