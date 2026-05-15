import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function NgoDonationRequests() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [spoilageRisk, setSpoilageRisk] = useState({}); // Store risk levels by donation ID
  const [expiryCountdown, setExpiryCountdown] = useState({}); // Store expiry countdowns
  const [distances, setDistances] = useState({}); // Store calculated distances by donation ID
  const [ngoLocation, setNgoLocation] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDonations();
    fetchNgoLocation();
  }, []);

  // Update expiry countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      updateExpiryCountdowns();
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [donations]);

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
        setCurrentPage(1);
        setError("");
        const nextDistances = {};
        data.forEach((donation) => {
          nextDistances[donation._id] = Number.isFinite(Number(donation.distanceKm))
            ? Number(donation.distanceKm).toFixed(1)
            : null;
        });
        setDistances(nextDistances);
        updateExpiryCountdowns(data); // Pass data instead of using state
      } else {
        setDonations([]);
      }
    } catch (err) {
      console.error("Error fetching donations:", err);
      setError("Failed to load donation requests");
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNgoLocation() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://food-backend-d44t.onrender.com/api/user/ngo-profile", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const profile = await res.json();
      const lat = Number(profile?.location?.lat);
      const lng = Number(profile?.location?.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setNgoLocation({ lat, lng });
      }
    } catch (err) {
      console.error("Error fetching NGO location:", err);
    }
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
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

  function getLatLng(source) {
    const lat = Number(source?.lat);
    const lng = Number(source?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  function getDonationDistance(donation) {
    const donationLocation = getLatLng(donation?.location) || getLatLng(donation?.donor_id?.location);
    const ngoPoint = getLatLng(ngoLocation);

    if (!donationLocation || !ngoPoint) {
      return null;
    }

    return calculateDistanceKm(donationLocation.lat, donationLocation.lng, ngoPoint.lat, ngoPoint.lng);
  }

  function getFoodTypeIndex(donation) {
    const type = String(donation?.food_type || '').trim().toLowerCase();
    if (type === 'vegetables') return 0;
    if (type === 'fruits') return 1;
    if (type === 'cooked') return 2;
    if (type === 'bakery') return 3;
    if (type === 'dairy') return 4;
    if (type === 'packaged') return 5;
    return getFoodType(donation?.food_name);
  }

  function estimateSpoilageRisk(donation) {
    if (!donation?.expiry_time) return null;

    const expiry = new Date(donation.expiry_time);
    if (Number.isNaN(expiry.getTime())) return null;

    const now = new Date();
    const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
    const distance = Number(donation.distanceKm ?? distances[donation._id]);

    if (hoursUntilExpiry <= 0) return 0.95;
    if (hoursUntilExpiry <= 2) return 0.8;
    if (hoursUntilExpiry <= 6) return distance > 15 ? 0.55 : 0.45;
    if (distance > 20) return 0.35;
    return 0.15;
  }

  function getDisplayedSpoilageRisk(donation) {
    const modelRisk = spoilageRisk[donation._id];
    if (modelRisk !== undefined) {
      return modelRisk;
    }

    return estimateSpoilageRisk(donation);
  }

  useEffect(() => {
    if (!donations.length) return;

    const nextDistances = {};
    donations.forEach((donation) => {
      const distance = Number(donation.distanceKm);
      if (Number.isFinite(distance)) {
        nextDistances[donation._id] = distance.toFixed(1);
        return;
      }

      const calculatedDistance = getDonationDistance(donation);
      nextDistances[donation._id] = calculatedDistance == null ? null : calculatedDistance.toFixed(1);
    });

    setDistances(nextDistances);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donations, ngoLocation]);

  useEffect(() => {
    if (!paginatedDonations.length) return;

    let cancelled = false;

    async function loadSpoilageRisks() {
      const pending = paginatedDonations.filter((donation) => spoilageRisk[donation._id] === undefined);
      if (!pending.length) return;

      const results = await Promise.all(
        pending.map(async (donation) => {
          try {
            const distance = getDonationDistance(donation) ?? 0;
            const response = await axios.post('https://food-backend-d44t.onrender.com/api/ai/predict-spoilage-with-expiry', {
              food_type: getFoodTypeIndex(donation),
              distance,
              temperature: 25,
              expiry_time: donation.expiry_time
            });

            return { id: donation._id, risk: response.data.risk_level };
          } catch (err) {
            console.error('Error loading spoilage risk:', err);
            return { id: donation._id, risk: null };
          }
        })
      );

      if (cancelled) return;

      setSpoilageRisk((prev) => {
        const next = { ...prev };
        results.forEach(({ id, risk }) => {
          if (risk !== null && risk !== undefined) {
            next[id] = risk;
          }
        });
        return next;
      });
    }

    loadSpoilageRisks();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, donations, ngoLocation]);

  function updateExpiryCountdowns(donationList = donations) {
    const newCountdowns = {};
    donationList.forEach(donation => {
      if (donation.expiry_time) {
        const now = new Date();
        const expiry = new Date(donation.expiry_time);
        const diff = expiry - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          newCountdowns[donation._id] = { hours, minutes, expired: false };
        } else {
          newCountdowns[donation._id] = { hours: 0, minutes: 0, expired: true };
        }
      }
    });
    setExpiryCountdown(newCountdowns);
  }

  async function handleAcceptRequest(donationId) {
    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/donations/${donationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "assigned" })
      });

      if (res.ok) {
        setDonations((currentDonations) => currentDonations.filter((donation) => donation._id !== donationId));
        setSpoilageRisk((currentRisk) => {
          const nextRisk = { ...currentRisk };
          delete nextRisk[donationId];
          return nextRisk;
        });
        setDistances((currentDistances) => {
          const nextDistances = { ...currentDistances };
          delete nextDistances[donationId];
          return nextDistances;
        });
        setExpiryCountdown((currentCountdowns) => {
          const nextCountdowns = { ...currentCountdowns };
          delete nextCountdowns[donationId];
          return nextCountdowns;
        });
        // Fetch spoilage risk for the accepted donation
        await fetchSpoilageRisk(donationId);
        fetchDonations();
        alert("Donation request accepted! Check spoilage risk warning.");
      } else {
        alert("Failed to accept donation request");
      }
    } catch (err) {
      console.error("Error accepting donation:", err);
      alert("Error accepting donation request");
    }
  }

  async function fetchSpoilageRisk(donationId) {
    try {
      const donation = donations.find(d => d._id === donationId);
      if (!donation) return;

      // Get distance (in km)
      const distance = getDonationDistance(donation) ?? 0;

      // Get temperature (default ambient)
      const temperature = 25; // Default 25°C

      // Determine food type (simplified: 0 for cooked, 1 for veggie, 2 for fruits)
      const foodType = getFoodTypeIndex(donation);

      // Use new endpoint with expiry_time for accurate delivery time calculation
      const response = await axios.post('https://food-backend-d44t.onrender.com/api/ai/predict-spoilage-with-expiry', {
        food_type: foodType,
        distance: distance,
        temperature: temperature,
        expiry_time: donation.expiry_time
      });

      setSpoilageRisk(prev => ({
        ...prev,
        [donationId]: response.data.risk_level
      }));
    } catch (err) {
      console.error("Error fetching spoilage risk:", err);
    }
  }

  function getFoodType(foodName) {
    // Simple classification
    const name = foodName.toLowerCase();
    if (name.includes('pack') || name.includes('packet') || name.includes('packaged') || name.includes('biscuit') || name.includes('chips') || name.includes('sealed') || name.includes('can') || name.includes('jar') || name.includes('box')) return 3;
    if (name.includes('fruit') || name.includes('salad') || name.includes('veggie')) return 1;
    if (name.includes('vegetable') || name.includes('veg')) return 1;
    return 0; // Cooked food by default
  }

  function getRiskLevel(riskScore) {
    if (riskScore === undefined) return null;
    if (riskScore > 0.7) return { level: 'Critical', color: '#d32f2f', icon: '⚠️' };
    if (riskScore > 0.4) return { level: 'High', color: '#f57c00', icon: '⚠️' };
    if (riskScore > 0.2) return { level: 'Medium', color: '#fbc02d', icon: '⚡' };
    return { level: 'Low', color: '#388e3c', icon: '✓' };
  }

  function getRiskAdvice(riskScore) {
    if (riskScore === undefined) return '';
    if (riskScore > 0.7) return 'Deliver immediately - High spoilage risk';
    if (riskScore > 0.4) return 'Prioritize delivery - Spoilage risk detected';
    if (riskScore > 0.2) return 'Standard delivery - Monitor conditions';
    return 'Safe for delivery';
  }

  function getExpiryUrgency(countdown) {
    if (!countdown) return null;
    if (countdown.expired) return { level: 'Expired', color: '#d32f2f', icon: '❌', urgent: true };
    if (countdown.hours === 0 && countdown.minutes <= 30) return { level: 'Critical', color: '#d32f2f', icon: '🔴', urgent: true };
    if (countdown.hours <= 2) return { level: 'Urgent', color: '#f57c00', icon: '🟠', urgent: true };
    if (countdown.hours <= 6) return { level: 'Soon', color: '#fbc02d', icon: '🟡', urgent: false };
    return { level: 'Available', color: '#388e3c', icon: '🟢', urgent: false };
  }

  function getDonationStatusInfo(donation) {
    const status = String(donation?.status || 'pending').toLowerCase();

    if (status === 'rejected') {
      return { label: 'Rejected', color: '#b91c1c', background: '#fee2e2' };
    }

    return { label: 'Pending', color: '#0369a1', background: '#e0f2fe' };
  }

  function formatExpiryTime(hours, minutes) {
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  async function handleRejectRequest(donationId) {
    // Show confirmation alert before rejecting
    const confirmed = window.confirm("Are you sure you want to reject this donation request?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/donations/${donationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "rejected" })
      });

      if (res.ok) {
        setDonations((currentDonations) =>
          currentDonations.map((donation) =>
            donation._id === donationId ? { ...donation, status: "rejected" } : donation
          )
        );
        alert("Donation request rejected successfully");
      } else {
        alert("Failed to reject donation request");
      }
    } catch (err) {
      console.error("Error rejecting donation:", err);
      alert("Error rejecting donation request");
    }
  }

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const filteredDonations = filter === 'all' 
    ? donations 
    : filter === 'expiring-soon'
    ? donations.filter(d => {
        const countdown = expiryCountdown[d._id];
        return countdown && (countdown.hours <= 6 && countdown.hours > 0);
      })
    : donations;

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const paginatedDonations = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <div className="ngo-page"><p>Loading donation requests...</p></div>;

  return (
    <div className="ngo-donations-container">
      <div className="donations-header">
        <h1>Accept Food Donation Requests</h1>
        <p className="subtitle">Review recent food donation requests and assign volunteers for pickup.</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      <div className="donations-toolbar">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select 
            id="status-filter"
            value={filter} 
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="expiring-soon">⏰ Expiring Soon (Next 6 hrs)</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchDonations}>
          Refresh
        </button>
      </div>

      {paginatedDonations.length === 0 ? (
        <p className="no-data">No donation requests available</p>
      ) : (
        <>
          <div className="donations-list">
            {paginatedDonations.map((donation) => (
              <div key={donation._id} className="donation-request-card">
                <div className="card-left">
                  <div
                    className="spoilage-risk-badge"
                    style={{
                      borderColor: getRiskLevel(getDisplayedSpoilageRisk(donation))?.color || '#cbd5e1',
                      color: getRiskLevel(getDisplayedSpoilageRisk(donation))?.color || '#64748b',
                    }}
                  >
                    <span className="spoilage-risk-badge-icon">
                      {getRiskLevel(getDisplayedSpoilageRisk(donation))?.icon || '⏳'}
                    </span>
                    <span className="spoilage-risk-badge-text">
                      {getRiskLevel(getDisplayedSpoilageRisk(donation))
                        ? `${getRiskLevel(getDisplayedSpoilageRisk(donation))?.level} Risk`
                        : 'Risk unavailable'}
                    </span>
                  </div>

                  <div className="donor-image">
                    <div className="food-icon-placeholder">
                      {donation.food_name?.toLowerCase().includes('rice') ? '🍚' :
                        donation.food_name?.toLowerCase().includes('bread') ? '🍞' :
                          donation.food_name?.toLowerCase().includes('fruit') ? '🍎' :
                            donation.food_name?.toLowerCase().includes('veg') ? '🥗' :
                              donation.food_name?.toLowerCase().includes('milk') || donation.food_name?.toLowerCase().includes('dairy') ? '🥛' :
                                donation.food_name?.toLowerCase().includes('chicken') || donation.food_name?.toLowerCase().includes('meat') ? '🍗' :
                                  '🍽️'}
                    </div>
                  </div>

                  <div className="donation-info">
                    <div className="donor-header">
                      <h3 className="donor-name">
                        {donation.donor_id?.name || 'Anonymous Donor'}
                      </h3>
                      <span className="donation-time">
                        {getTimeAgo(donation.createdAt)}
                      </span>
                    </div>

                    <div
                      className="donation-status-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginTop: '8px',
                        marginBottom: '8px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: getDonationStatusInfo(donation).color,
                        background: getDonationStatusInfo(donation).background,
                      }}
                    >
                      {getDonationStatusInfo(donation).label}
                    </div>
                    
                    <p className="quantity-badge">
                      <strong>{donation.quantity}</strong> {donation.quantity > 1 ? 'Meals' : 'Meal'}
                    </p>
                    
                    <p className="food-description">
                      {donation.food_name}
                    </p>

                    {donation.expiry_time && (
                      <p className="expiry-datetime">
                        <strong>⏰ Expires:</strong> {new Date(donation.expiry_time).toLocaleString()}
                      </p>
                    )}

                    {donation.expiry_time && expiryCountdown[donation._id] && (
                      <div 
                        className="expiry-countdown"
                        style={{ borderLeft: `3px solid ${getExpiryUrgency(expiryCountdown[donation._id])?.color}` }}
                      >
                        <div className="expiry-header">
                          <span className="expiry-icon">{getExpiryUrgency(expiryCountdown[donation._id])?.icon}</span>
                          <span className="expiry-level" style={{ color: getExpiryUrgency(expiryCountdown[donation._id])?.color }}>
                            {getExpiryUrgency(expiryCountdown[donation._id])?.level}
                          </span>
                        </div>
                        <p className="expiry-time">
                          {expiryCountdown[donation._id].expired 
                            ? "Expired" 
                            : `Expires in: ${formatExpiryTime(expiryCountdown[donation._id].hours, expiryCountdown[donation._id].minutes)}`}
                        </p>
                      </div>
                    )}
                    
                    <div className="location-info">
                      <p className="address">
                        <strong>📍</strong> {donation.address}
                      </p>
                      <p className="distance">
                        <strong>📍</strong> {distances[donation._id] ?? (Number.isFinite(Number(donation.distanceKm)) ? Number(donation.distanceKm).toFixed(1) : 'Location unavailable')} km away
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-right">
                  {String(donation.status || 'pending').toLowerCase() === 'rejected' ? (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    >
                      Rejected
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button 
                        className="btn btn-accept"
                        onClick={() => handleAcceptRequest(donation._id)}
                        title="Accept this donation request"
                      >
                        ✓ Accept Request
                      </button>
                      <button 
                        className="btn btn-reject"
                        onClick={() => handleRejectRequest(donation._id)}
                        title="Reject this donation request"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <div className="page-info">
                {currentPage.toString().padStart(1, '0')}
                <span className="page-divider">|</span>
                {totalPages.toString().padStart(1, '0')}
              </div>

              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
