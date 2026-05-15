const express = require("express");
const router = express.Router();
const Donation = require("../models/donations");
const User = require("../models/user");
const NGO = require("../models/ngo");
const Pickup = require("../models/pickup");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Export donations to CSV
const generateDonationCSV = (donations) => {
  const headers = ["Donation ID", "Donor Name", "Food Name", "Food Type", "Quantity", "Status", "Created Date"];
  const rows = donations.map(d => [
    d._id.toString(),
    d.donor_id?.name || "Unknown",
    d.food_name,
    d.food_type || "Other",
    d.quantity,
    d.status,
    new Date(d.createdAt).toLocaleDateString()
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  return csv;
};

// Export NGOs to CSV
const generateNgoCSV = (ngos) => {
  const headers = ["NGO ID", "Name", "Email", "Status", "Approval Status", "Created Date"];
  const rows = ngos.map(n => [
    n._id.toString(),
    n.name,
    n.email,
    n.approval_status || "Active",
    n.approval_status || "Active",
    new Date(n.createdAt).toLocaleDateString()
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  return csv;
};

// Export pickups to CSV
const generatePickupCSV = (pickups) => {
  const headers = ["Pickup ID", "Donation", "NGO", "Volunteer", "Status", "Scheduled Date"];
  const rows = pickups.map(p => [
    p._id.toString(),
    p.donation_id?.food_name || "Unknown",
    p.ngo_id?.name || "Unknown",
    p.volunteer_id?.name || "Unassigned",
    p.status,
    new Date(p.scheduled_pickup_time).toLocaleDateString()
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  return csv;
};

// Export impact stats (admin)
const generateImpactCSV = async () => {
  const donations = await Donation.find({ status: "completed" });
  const ngos = await NGO.find();
  const totalDonations = donations.length;
  const totalMeals = donations.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const carbonSaved = totalMeals * 2;

  const headers = ["Metric", "Value"];
  const rows = [
    ["Total Completed Donations", totalDonations],
    ["Total Meals Donated", totalMeals],
    ["Estimated CO₂ Saved (kg)", carbonSaved],
    ["Active NGOs", ngos.filter(n => n.approval_status === "active").length],
    ["Report Generated", new Date().toLocaleString()]
  ];

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  return csv;
};

// Generate export report
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { report_type } = req.body;

    let csvContent = "";
    let filename = "";

    switch (report_type) {
      case "donations":
        const donations = await Donation.find().populate("donor_id", "name email");
        csvContent = generateDonationCSV(donations);
        filename = `donations_${new Date().getTime()}.csv`;
        break;

      case "ngos":
        const ngos = await NGO.find();
        csvContent = generateNgoCSV(ngos);
        filename = `ngos_${new Date().getTime()}.csv`;
        break;

      case "pickups":
        const pickups = await Pickup.find()
          .populate("donation_id")
          .populate("ngo_id")
          .populate("volunteer_id");
        csvContent = generatePickupCSV(pickups);
        filename = `pickups_${new Date().getTime()}.csv`;
        break;

      case "impact":
        csvContent = await generateImpactCSV();
        filename = `impact_stats_${new Date().getTime()}.csv`;
        break;

      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
});

module.exports = router;
