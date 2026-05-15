import React, { useState, useEffect } from 'react';
import DeliveryMap from '../components/DeliveryMap';
import { NotificationService } from '../../services/NotificationService';

export default function NgoPickups() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [notifications, setNotifications] = useState([]); // Store active notifications
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [proximityAlerts, setProximityAlerts] = useState({}); // Track which pickups have triggered nearby alert
  const [expandedPickups, setExpandedPickups] = useState({});

  useEffect(() => {
    fetchPickups();
    // Request notification permission on mount
    requestNotificationPermission();
  }, []);

  async function requestNotificationPermission() {
    const hasPermission = await NotificationService.requestPermission();
    setNotificationPermission(hasPermission);
  }

  // Real-time tracking update every 5 seconds
  useEffect(() => {
    if (selectedPickup && tracking) {
      const interval = setInterval(() => {
        fetchTrackingData(selectedPickup._id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPickup, tracking]);

  async function fetchPickups() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/ngo/pickups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPickups(data);
        setCurrentPage(1);
        setError("");
      } else {
        setPickups([]);
      }
    } catch (err) {
      console.error("Error fetching pickups:", err);
      setError("Failed to load pickups");
      setPickups([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrackingData(pickupId) {
    setTrackingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/pickup/${pickupId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.pickup) {
        setTrackingData(data);
        checkProximityAndNotify(pickupId, data);
      } else {
        console.error("No pickup data in tracking response:", data);
      }
    } catch (err) {
      console.error("Error fetching tracking data:", err);
    } finally {
      setTrackingLoading(false);
    }
  }

  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function checkProximityAndNotify(pickupId, trackingData) {
    const distance = calculateDistance(
      trackingData.volunteer_location.lat,
      trackingData.volunteer_location.lng,
      trackingData.ngo_location.lat,
      trackingData.ngo_location.lng
    );

    // Notify if within 2 km and haven't already notified
    if (distance < 2 && !proximityAlerts[pickupId]) {
      const volunteerName = trackingData.pickup.volunteer_id?.name || 'Volunteer';
      NotificationService.notifyDeliveryNearby(distance.toFixed(2), volunteerName);
      
      // Add UI notification
      addNotification(`🚴 ${volunteerName} is ${distance.toFixed(2)} km away!`, 'nearby');
      
      // Mark as notified
      setProximityAlerts(prev => ({ ...prev, [pickupId]: true }));
    }

    // Notify if very close (< 0.5 km)
    if (distance < 0.5 && proximityAlerts[pickupId]) {
      const volunteerName = trackingData.pickup.volunteer_id?.name || 'Volunteer';
      NotificationService.notifyDeliveryArrived(volunteerName);
      
      addNotification(`✓ ${volunteerName} has arrived!`, 'arrived');
    }
  }

  function addNotification(message, type = 'info') {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }

  async function startTracking(pickup) {
    setSelectedPickup(pickup);
    setTracking(true);
    await fetchTrackingData(pickup._id);
  }

  function stopTracking() {
    setTracking(false);
    setSelectedPickup(null);
    setTrackingData(null);
  }

  function togglePickupDetails(pickupId) {
    setExpandedPickups((prev) => ({
      ...prev,
      [pickupId]: !prev[pickupId]
    }));
  }

  async function updatePickupStatus(pickupId, newStatus) {
    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(`http://localhost:5000/api/pickups/${pickupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const updatedPickup = await res.json();
        setPickups(pickups.map(p => p._id === pickupId ? updatedPickup : p));
        alert(`Status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`);
      } else {
        alert("Failed to update pickup status");
      }
    } catch (err) {
      console.error("Error updating pickup:", err);
      alert("Error updating pickup status");
    }
  }

  const filteredPickups = filter === 'all' 
    ? pickups 
    : pickups.filter(p => p.status === filter);

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(filteredPickups.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPickups = filteredPickups.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  if (loading) return <div className="ngo-page"><p>Loading pickups...</p></div>;

  return (
    <div className="ngo-page ngo-pickups">
      {/* Notification Permission Request */}
      {notificationPermission === false && (
        <div className="notification-permission-banner">
          <span>📢 Enable notifications to get alerts when delivery arrives</span>
          <button 
            className="btn-enable-notifications"
            onClick={requestNotificationPermission}
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Active Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification notification-${notification.type}`}>
              {notification.message}
            </div>
          ))}
        </div>
      )}

      <h1>Pickups Management</h1>
      <p className="page-subtitle">Track and manage food pickup assignments and delivery status.</p>
      {error && <div className="error-message">{error}</div>}
      
      <div className="filter-controls">
        <label>Status: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Pickups</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="scheduled">Scheduled</option>
          <option value="picked">Picked Up</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {filteredPickups.length === 0 ? (
        <p className="no-data">No pickups found</p>
      ) : (
        <div className="pickups-list">
          {paginatedPickups.map((pickup) => {
            const isExpanded = Boolean(expandedPickups[pickup._id]);

            return (
            <div key={pickup._id} className="pickup-card">
              <div className="pickup-header">
                <h3>Pickup #{pickup._id.slice(-6).toUpperCase()}</h3>
                <span className={`status-badge status-${pickup.status}`}>
                  {pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
                </span>
              </div>
              
              <div className="pickup-details">
                <p><strong>Food:</strong> {pickup.donation_id?.food_name || 'N/A'}</p>
                <p><strong>Volunteer:</strong> {pickup.volunteer_id?.name || 'Not assigned yet'}</p>
                {pickup.delivered_at && (
                  <p><strong>Delivered:</strong> {new Date(pickup.delivered_at).toLocaleString()}</p>
                )}
              </div>

              <div className="pickup-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => togglePickupDetails(pickup._id)}
                >
                  {isExpanded ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {isExpanded && (
                <div className="pickup-details">
                {pickup.donation_id && (
                  <>
                    <p><strong>Quantity:</strong> {pickup.donation_id.quantity} servings</p>
                    <p><strong>Pickup Address:</strong> {pickup.donation_id.address}</p>
                  </>
                )}
                
                {pickup.volunteer_id && (
                  <>
                    <p><strong>Contact:</strong> {pickup.volunteer_id.phone || pickup.volunteer_id.email}</p>
                  </>
                )}

                {pickup.picked_at && (
                  <p><strong>Picked At:</strong> {new Date(pickup.picked_at).toLocaleString()}</p>
                )}
                {pickup.delivered_at && (
                  <p><strong>Delivered At:</strong> {new Date(pickup.delivered_at).toLocaleString()}</p>
                )}
              </div>
              )}

              {isExpanded && pickup.timeline && pickup.timeline.length > 0 && (
                <div className="pickup-timeline">
                  <h4>Timeline</h4>
                  <ul className="timeline-list">
                    {pickup.timeline.map((entry, index) => (
                      <li key={index} className="timeline-entry">
                        <span className="timeline-status">{entry.status}</span>
                        <span className="timeline-time">
                          {new Date(entry.updatedAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pickup-actions">
                {pickup.status === 'pending' && (
                  <button 
                    className="btn-primary"
                    onClick={() => updatePickupStatus(pickup._id, 'assigned')}
                  >
                    Accept Donation
                  </button>
                )}
                {(pickup.status === 'assigned') && (
                  <span className="btn-disabled">Awaiting scheduling</span>
                )}
                {(pickup.status === 'scheduled' || pickup.status === 'picked') && (
                  <>
                    <span className="btn-disabled">
                      {pickup.status === 'scheduled' ? 'Pickup scheduled' : 'Pickup in transit'}
                    </span>
                    <button 
                      className="btn-track"
                      onClick={() => startTracking(pickup)}
                      title="Track delivery in real-time"
                    >
                      🗺️ Track Delivery
                    </button>
                  </>
                )}
                {pickup.status === 'delivered' && (
                  <>
                    <span className="btn-disabled">Completed</span>
                  </>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {filteredPickups.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={safeCurrentPage === 1}
          >
            Previous
          </button>

          <div className="page-info">
            {String(safeCurrentPage).padStart(1, '0')}
            <span className="page-divider">|</span>
            {String(totalPages).padStart(1, '0')}
          </div>

          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={safeCurrentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Real-time Delivery Tracking */}
      {tracking && selectedPickup && (
        <div className="tracking-modal">
          <div className="tracking-header">
            <h2>🗺️ Live Delivery Tracking</h2>
            <button className="btn-close" onClick={stopTracking}>✕</button>
          </div>
          <div className="tracking-content">
            {trackingLoading && !trackingData ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                <p>Loading tracking data...</p>
              </div>
            ) : trackingData ? (
              <DeliveryMap
                pickup={selectedPickup}
                volunteerLocation={trackingData.volunteer_location}
                ngoLocation={trackingData.ngo_location}
                pickupAddress={trackingData.pickupAddress}
                pickupLatitude={trackingData.pickupLatitude}
                pickupLongitude={trackingData.pickupLongitude}
                ngoAddress={trackingData.ngoAddress}
                ngoLatitude={trackingData.ngoLatitude}
                ngoLongitude={trackingData.ngoLongitude}
                pickupLocation={trackingData.pickup_location}
                donationLocation={trackingData.donation_location}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                <p>Could not load tracking data. Please try again.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
