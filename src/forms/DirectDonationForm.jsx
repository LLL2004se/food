import React, { useState, useEffect } from 'react';

const API_BASE = "https://food-backend-d44t.onrender.com";
const SUCCESS_GIF_SRC = encodeURI("/Form Submission (1).gif");

export default function DirectDonationForm({ onDone, auth, onRequireLogin }) {
    const [foodName, setFoodName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [expiryTime, setExpiryTime] = useState("");
    const [address, setAddress] = useState("");
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [selectedNgoId, setSelectedNgoId] = useState("");
    const [ngos, setNgos] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessGif, setShowSuccessGif] = useState(false);

    // Fetch NGOs on mount
    useEffect(() => {
        fetchNgos();
        // Get user's location if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                }
            );
        }
    }, []);

    async function fetchNgos() {
        try {
            const res = await fetch(`${API_BASE}/api/ngos`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setNgos(data);
                if (data.length > 0) {
                    setSelectedNgoId(data[0]._id);
                }
            }
        } catch (err) {
            console.error("Error fetching NGOs:", err);
            setError("Failed to load NGO list");
        }
    }

    async function submit(e) {
        e.preventDefault();
        setError("");
        if (!foodName || !quantity || !address) {
            setError("Please fill all required fields.");
            return;
        }
        const token = auth?.user?.token || localStorage.getItem("token");
        if (!token) {
            setError("Please log in to submit a donation.");
            return;
        }

        const donationData = {
            food_name: foodName,
            quantity: Number(quantity),
            expiry_time: expiryTime || undefined,
            address,
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
            setFoodName("");
            setQuantity("");
            setExpiryTime("");
            setAddress("");
            setSelectedNgoId("");
            setShowSuccessGif(false);
            onDone();
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="form-scroll">
            {error && (
                <div className="form-error-box">{error}</div>
            )}
            <div className="form-group">
                <label>Food Name *</label>
                <input 
                    value={foodName} 
                    onChange={e => setFoodName(e.target.value)} 
                    placeholder="e.g., Rice, Vegetables, Bread"
                    required 
                />
            </div>
            <div className="form-group">
                <label>Quantity *</label>
                <input 
                    type="number"
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    placeholder="e.g., 10 (servings or kg)"
                    required 
                />
            </div>
            <div className="form-group">
                <label>Expiry Time</label>
                <input 
                    type="datetime-local"
                    value={expiryTime} 
                    onChange={e => setExpiryTime(e.target.value)} 
                />
            </div>
            <div className="form-group">
                <label>Pickup Address *</label>
                <input 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="Enter pickup address"
                    required 
                />
            </div>
            <div className="form-group">
                <label>Select NGO for Donation (Optional - Leave empty to show on Home page)</label>
                <select 
                    value={selectedNgoId} 
                    onChange={e => setSelectedNgoId(e.target.value)}
                >
                    <option value="">No specific NGO - Show on Home page</option>
                    {ngos.map((ngo) => (
                        <option key={ngo._id} value={ngo._id}>
                            {ngo.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-actions">
                <button type="submit" className="button-indigo" disabled={submitting}>
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