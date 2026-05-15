import React, { useState, useEffect } from 'react';

export default function NgoHome() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDonations();
  }, []);

  async function fetchDonations() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://food-backend-d44t.onrender.com/api/ngo/available-donations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDonations(data);
        setError("");
      } else {
        setDonations([]);
      }
    } catch (err) {
      console.error("Error fetching donations:", err);
      setError("Failed to load donations");
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptRequest(donationId) {
    try {
      const token = localStorage.getItem("token");
      
      // Update donation status to assigned
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/donations/${donationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "assigned" })
      });

      if (res.ok) {
        alert("Donation request accepted! Pickup will be arranged shortly.");
        setDonations((prev) => prev.filter((donation) => donation._id !== donationId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || data?.error || "Failed to accept request");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error accepting request");
    }
  }

  async function handleRejectRequest(donationId) {
    if (!window.confirm("Are you sure you want to reject this request?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/donations/${donationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "pending" })
      });

      if (res.ok) {
        alert("Request rejected");
        fetchDonations();
      } else {
        alert("Failed to reject request");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error rejecting request");
    }
  }

  const filteredDonations = filter === 'all' 
    ? donations 
    : donations.filter(d => d.status === filter);

  return (
    <div className="ngo-home-page">
      <div className="ngo-page-header">
        <div className="ngo-header-content">
          <h1>Accept Food Donation Requests</h1>
          <p>Review recent food donation requests and accept for pickup.</p>
        </div>
        <div className="ngo-header-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="ngo-filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={fetchDonations} className="ngo-refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="ngo-error-message">{error}</div>}

      {loading ? (
        <div className="ngo-loading">Loading donations...</div>
      ) : filteredDonations.length === 0 ? (
        <div className="ngo-empty-state">
          <p>No {filter} donations available</p>
        </div>
      ) : (
        <div className="ngo-donations-list">
          {filteredDonations.map((donation) => (
            <div key={donation._id} className="ngo-donation-card">
              <div className="ngo-card-header">
                <div className="ngo-donor-info">
                  <h3 className="ngo-donor-name">{donation.donor_id?.name || "Donor"}</h3>
                  <span className={`ngo-status-badge status-${donation.status}`}>
                    {donation.status?.toUpperCase() || "PENDING"}
                  </span>
                </div>
                <span className="ngo-time-ago">
                  {donation.createdAt ? new Date(donation.createdAt).toLocaleTimeString() : "Just now"}
                </span>
              </div>

              <div className="ngo-card-content">
                <div className="ngo-food-details">
                  <div className="ngo-quantity">{donation.quantity || 20}</div>
                  <div className="ngo-food-info">
                    <p className="ngo-food-name">{donation.food_name || "Food Donation"}</p>
                    {donation.expiry_time && (
                      <p className="ngo-food-desc">Expires: {new Date(donation.expiry_time).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <div className="ngo-location-info">
                  <div className="ngo-location-item">
                    <span className="ngo-location-icon">📍</span>
                    <span className="ngo-address">
                      {typeof donation.address === 'object' 
                        ? `${donation.address?.building}, ${donation.address?.block}, ${donation.address?.road}, ${donation.address?.state}`
                        : donation.address || "Address not provided"}
                    </span>
                  </div>
                  {donation.location?.lat && donation.location?.lng && (
                    <div className="ngo-location-item">
                      <span className="ngo-distance-icon">📍</span>
                      <span className="ngo-distance">{Math.random().toFixed(1)} km away</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ngo-card-actions">
                <button 
                  onClick={() => handleAcceptRequest(donation._id)}
                  className="ngo-accept-btn"
                  disabled={donation.status !== "pending"}
                >
                  ✓ Accept Request
                </button>
                <button 
                  onClick={() => handleRejectRequest(donation._id)}
                  className="ngo-reject-btn"
                  disabled={donation.status !== "pending"}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ngo-pagination">
        <button className="ngo-pagination-btn">Previous</button>
        <span className="ngo-pagination-number">1</span>
        <button className="ngo-pagination-btn">Next</button>
      </div>
    </div>
  );
}
