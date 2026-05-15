import React, { useState, useEffect } from "react";
const API_BASE = "https://food-backend-d44t.onrender.com";
const SUCCESS_GIF_SRC = encodeURI("/Form Submission (1).gif");

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address.trim();

  const parts = [address.building, address.block, address.road, address.state]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  return parts.join(", ");
}

// Haversine formula to calculate distance in km
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getFoodTypeLabel(foodType) {
  switch (foodType) {
    case "vegetables":
      return "Produce";
    case "dairy":
      return "Dairy";
    case "bakery":
      return "Grains & Baked";
    case "cooked":
      return "Protein";
    case "beverages":
      return "Beverages";
    case "packaged":
      return "Packaged";
    default:
      return "Other";
  }
}

function requiresExpiryTime(foodType) {
  return ["vegetables", "dairy", "bakery", "cooked"].includes(foodType);
}

export default function RestaurantForm({ onDone, auth, onRequireLogin }) {
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantLat, setRestaurantLat] = useState(null);
  const [restaurantLng, setRestaurantLng] = useState(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [foodType, setFoodType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [selectedNgoId, setSelectedNgoId] = useState("");
  
  const [ngos, setNgos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessGif, setShowSuccessGif] = useState(false);

  // Fetch NGOs on component mount
  useEffect(() => {
    fetchNgos();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchProfileAddress() {
      const profileAddress = formatAddress(auth?.user?.address);
      if (profileAddress) {
        setRestaurantAddress((current) => current || profileAddress);
        return;
      }

      const token = auth?.user?.token || localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const profile = await res.json();
        const nextAddress = formatAddress(profile.address);
        if (isActive && nextAddress) {
          setRestaurantAddress((current) => current || nextAddress);
        }
      } catch (err) {
        console.error("Error fetching profile address:", err);
      }
    }

    fetchProfileAddress();

    return () => {
      isActive = false;
    };
  }, [auth?.user?.address, auth?.user?.token]);

  async function fetchNgos() {
    try {
      const res = await fetch(`${API_BASE}/api/ngos`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNgos(data);
      }
    } catch (err) {
      console.error("Error fetching NGOs:", err);
      setError("Failed to load NGO list");
    }
  }

  // Convert address to coordinates (dummy example, replace with Google Geocoding API)
  function handleAddressChange(e) {
    setRestaurantAddress(e.target.value);
    // Example: hardcoded lat/lng for Pune
    if (e.target.value.toLowerCase().includes("pune")) {
      setRestaurantLat(18.5204);
      setRestaurantLng(73.8567);
    }
  }

  // Sort NGOs by distance
  const sortedNgos =
    restaurantLat && restaurantLng
      ? ngos
          .map((ngo) => ({
            ...ngo,
            distance: getDistance(restaurantLat, restaurantLng, ngo.location?.lat || 0, ngo.location?.lng || 0),
          }))
          .sort((a, b) => a.distance - b.distance)
      : ngos;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name || !contact || !foodType || !quantity || !restaurantAddress) {
      setError("Please fill all required fields.");
      return;
    }
    if (requiresExpiryTime(foodType) && !pickupTime) {
      setError("Please enter an expiry time for produce and other perishable food.");
      return;
    }
    const token = auth?.user?.token || localStorage.getItem("token");
    if (!token) {
      setError("Please log in to submit a donation.");
      return;
    }

    const donationData = {
      food_name: getFoodTypeLabel(foodType) + (description ? ` - ${description}` : ""),
      food_type: foodType,
      quantity: Number(quantity),
      expiry_time: pickupTime || undefined,
      address: restaurantAddress,
      ngo_id: selectedNgoId || undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(donationData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("currentPage");
          setError("Your session expired. Please log in again.");
          if (typeof onRequireLogin === "function") {
            onRequireLogin();
          }
          return;
        }
        setError(data.message || "Failed to submit donation.");
        return;
      }
      setName("");
      setContact("");
      setFoodType("");
      setQuantity("");
      setDescription("");
      setPickupTime("");
      setRestaurantAddress("");
      setSelectedNgoId("");
      setRestaurantLat(null);
      setRestaurantLng(null);
      setShowSuccessGif(false);
      onDone();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-scroll">
      {error && <div className="form-error-box">{error}</div>}
      <div className="form-group">
        <label>Restaurant Name / Your Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="form-group">
        <label>Contact</label>
        <input value={contact} onChange={(e) => setContact(e.target.value)} required />
      </div>

      <div className="form-group">
        <label>Address</label>
        <input
          value={restaurantAddress}
          onChange={handleAddressChange}
          placeholder="Enter your address"
          required
        />
      </div>

      <div className="form-group">
        <label>Food Type</label>
        <select value={foodType} onChange={(e) => setFoodType(e.target.value)} required>
          <option value="">Select food type</option>
          <option value="dairy">Dairy</option>
          <option value="vegetables">Produce</option>
          <option value="bakery">Grains & Baked</option>
          <option value="cooked">Protein</option>
          <option value="beverages">Beverages</option>
          <option value="packaged">Packaged</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Quantity</label>
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g., 25 meals or 10 kg"
          required
        />
      </div>

      <div className="form-group">
        <label>Description of Food</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Expiry Time / Preferred Pickup Time</label>
        <input
          type="datetime-local"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
          required={requiresExpiryTime(foodType)}
        />
      </div>

      <div className="form-group">
        <label>Select NGOs for Donation (Optional - Leave empty to show on Home page)</label>
        <select value={selectedNgoId} onChange={(e) => setSelectedNgoId(e.target.value)}>
          <option value="">No specific NGO - Show on Home page</option>
          {sortedNgos.map((ngo) => (
            <option key={ngo._id} value={ngo._id}>
              {ngo.name} {ngo.distance ? `(${ngo.distance.toFixed(1)} km away)` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="button-emerald" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Donation"}
        </button>
      </div>
      {showSuccessGif && (
        <div className="gif-overlay">
          <img src={SUCCESS_GIF_SRC} alt="Form Submitted" className="submission-gif" />
        </div>
      )}
    </form>
  );
}
