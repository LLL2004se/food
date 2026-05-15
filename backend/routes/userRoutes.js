const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../models/user");
const Donation = require("../models/donations");
const NGO = require("../models/ngo");
const Pickup = require("../models/pickup");
const Request = require("../models/request");
const { requireAuth } = require("../middleware/auth");

async function geocodeAddress(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "jsonv2",
        limit: 1,
      },
      headers: {
        "User-Agent": "food-rescue-app/1.0",
      },
      timeout: 7000,
    });

    const result = Array.isArray(response.data) ? response.data[0] : null;
    if (!result) return null;

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error("Address geocoding failed:", err.message);
    return null;
  }
}

function mergeAddressWithLocation(address, location) {
  const nextAddress = address && typeof address === "object" ? { ...address } : {};
  if (typeof address === "string") {
    nextAddress.full_address = address.trim();
  } else if (!nextAddress.full_address) {
    const parts = [nextAddress.building, nextAddress.block, nextAddress.city]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);

    if (parts.length > 0) {
      nextAddress.full_address = parts.join(", ");
    }
  }

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    nextAddress.lat = lat;
    nextAddress.lng = lng;
  }

  return nextAddress;
}

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function formatAddressForDonation(address) {
  if (!address) return "";
  if (typeof address === "string") return address.trim();

  if (typeof address.full_address === "string" && address.full_address.trim()) {
    return address.full_address.trim();
  }

  const parts = [address.building, address.block, address.city]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  return parts.join(", ");
}

// Get user profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    console.log("=== FETCHING USER PROFILE ===");
    console.log("User ID:", userId);
    
    const user = await User.findById(userId).select("-password");
    if (!user) {
      console.error("User not found with ID:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User found, returning profile");
    console.log("Profile picture size:", user.profile_picture ? user.profile_picture.length : 0);
    res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { first_name, last_name, username, phone, bio, address, location, profile_picture } = req.body;
    const manualLocation = normalizeLocation(location);

    // Log incoming data
    console.log("=== USER PROFILE UPDATE ===");
    console.log("User ID:", userId);
    console.log("Profile picture received:", profile_picture ? "YES (" + profile_picture.length + " bytes)" : "NO");
    console.log("Other fields:", { first_name, last_name, username, phone, bio });

    // Validate profile picture size (max 1MB for base64)
    if (profile_picture && profile_picture.length > 1024 * 1024) {
      console.error("Image too large:", profile_picture.length, "bytes");
      return res.status(400).json({ error: "Image is too large. Please use a smaller image." });
    }

    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (address !== undefined) {
      updateData.address = mergeAddressWithLocation(address, manualLocation);
      if (manualLocation) {
        updateData.location = manualLocation;
      } else {
        const geocodedLocation = await geocodeAddress(address);
        if (geocodedLocation) {
          updateData.address = mergeAddressWithLocation(address, geocodedLocation);
          updateData.location = geocodedLocation;
        }
      }
    } else if (manualLocation) {
      updateData.location = manualLocation;
    }
    if (profile_picture !== undefined) {
      console.log("Adding profile_picture to updateData, size:", profile_picture.length);
      updateData.profile_picture = profile_picture;
    }

    console.log("Update data keys:", Object.keys(updateData));

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      console.error("User not found after update for ID:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    if (address !== undefined) {
      const donationUpdate = {
        address: formatAddressForDonation(updateData.address),
      };

      if (updateData.location) {
        donationUpdate.location = updateData.location;
      }

      await Donation.updateMany(
        {
          donor_id: userId,
          status: { $in: ["pending", "assigned"] },
        },
        { $set: donationUpdate }
      );
    }

    console.log("User updated successfully");
    console.log("Returning profile_picture size:", user.profile_picture ? user.profile_picture.length : 0);
    console.log("Profile picture value (first 100 chars):", user.profile_picture ? user.profile_picture.substring(0, 100) : "NULL");
    res.json(user);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get NGO profile
router.get("/ngo-profile", requireAuth, async (req, res) => {
  try {
    const ngoId = req.userId;
    
    const ngo = await NGO.findById(ngoId).select("-password");
    if (!ngo) {
      return res.status(404).json({ error: "NGO not found" });
    }

    res.json(ngo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update NGO profile
router.patch("/ngo-profile", requireAuth, async (req, res) => {
  try {
    const ngoId = req.userId;
    const { name, phone, address, website, registration_number, description, location, bio, profile_picture, area_of_service } = req.body;
    const manualLocation = normalizeLocation(location);

    // Validate profile picture size (max 1MB for base64)
    if (profile_picture && profile_picture.length > 1024 * 1024) {
      return res.status(400).json({ error: "Image is too large. Please use a smaller image or upload via URL field." });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) {
      updateData.address = mergeAddressWithLocation(address, manualLocation);
      if (manualLocation) {
        updateData.location = manualLocation;
      } else {
        const geocodedLocation = await geocodeAddress(address);
        if (geocodedLocation) {
          updateData.address = mergeAddressWithLocation(address, geocodedLocation);
          updateData.location = geocodedLocation;
        }
      }
      updateData.address = formatAddressForDonation(updateData.address);
    }
    if (website !== undefined) updateData.website = website;
    if (registration_number !== undefined) updateData.registration_number = registration_number;
    if (description !== undefined) updateData.description = description;
    if (address === undefined && manualLocation) updateData.location = manualLocation;
    if (bio !== undefined) updateData.bio = bio;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    if (Array.isArray(area_of_service)) updateData.area_of_service = area_of_service;
    else if (typeof area_of_service === "string") {
      updateData.area_of_service = area_of_service
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const ngo = await NGO.findByIdAndUpdate(
      ngoId,
      updateData,
      { new: true }
    ).select("-password");

    if (!ngo) {
      return res.status(404).json({ error: "NGO not found" });
    }

    res.json(ngo);
  } catch (err) {
    console.error("NGO profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get pickups for a specific user (volunteer)
router.get("/pickups", async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: "user_id query parameter is required" });
    }

    const pickups = await Pickup.find({ volunteer_id: user_id })
      .populate("donation_id", "donor_id quantity food_type")
      .populate("volunteer_id", "name email phone_number")
      .sort({ createdAt: -1 });

    res.json(pickups);
  } catch (err) {
    console.error("Error fetching user pickups:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get requests for a specific user (NGO)
router.get("/requests", async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: "user_id query parameter is required" });
    }

    const requests = await Request.find({ requester_id: user_id })
      .populate("requester_id", "name email organization phone_number")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching user requests:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get donations for a specific user (donor)
router.get("/donations", async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: "user_id query parameter is required" });
    }

    const donations = await Donation.find({ donor_id: user_id })
      .populate("donor_id", "name email")
      .populate("ngo_id", "name")
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (err) {
    console.error("Error fetching user donations:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
