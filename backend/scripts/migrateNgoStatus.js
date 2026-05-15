const mongoose = require("mongoose");
const NGO = require("../models/ngo");
require("dotenv").config();

async function migrateNgoStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✓ MongoDB connected");

    // Update all NGOs to active status
    const result = await NGO.updateMany(
      { approval_status: "pending" },
      { approval_status: "active" }
    );

    console.log(`✓ Updated ${result.modifiedCount} NGOs to active status`);
    console.log(`✓ Matched ${result.matchedCount} NGOs with pending status`);

    // Verify the update
    const activeNgos = await NGO.countDocuments({ approval_status: "active" });
    const pendingNgos = await NGO.countDocuments({ approval_status: "pending" });

    console.log(`\nCurrent Status:`);
    console.log(`- Active NGOs: ${activeNgos}`);
    console.log(`- Pending NGOs: ${pendingNgos}`);

    await mongoose.connection.close();
    console.log("\n✓ Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrateNgoStatus();
