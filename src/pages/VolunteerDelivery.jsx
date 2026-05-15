import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const volunteerIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
  shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
  shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function FitMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = points.filter((point) => point && point.lat != null && point.lng != null);
    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lng], 14);
      return;
    }

    const bounds = L.latLngBounds(validPoints.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, points]);

  return null;
}

function normalizePickupStatus(status) {
  if (status === "scheduled") return "assigned";
  return status;
}

const STATUS_FLOW = [
  { key: "assigned", label: "Assigned", icon: "\uD83D\uDCCB" },
  { key: "picked", label: "Pickup", icon: "\uD83D\uDCE6" },
  { key: "delivered", label: "Delivered", icon: "\u2705" },
];

export default function VolunteerDelivery({ auth, setPage }) {
  const [tab, setTab] = useState("active"); // active | available | history
  const [availablePickups, setAvailablePickups] = useState([]);
  const [dismissedPickupIds, setDismissedPickupIds] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [historyDeliveries, setHistoryDeliveries] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [roadRoute, setRoadRoute] = useState([]);
  const [roadRouteInfo, setRoadRouteInfo] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!auth?.isLoggedIn) return;
    try {
      const stored = localStorage.getItem("dismissedVolunteerPickups");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setDismissedPickupIds(parsed);
      }
    } catch (err) {
      // ignore malformed local state
    }
    fetchAll();
  }, [auth]);

  useEffect(() => {
    if (tracking) return;
    const profileLocation = auth?.user?.current_location || auth?.user?.location;
    if (profileLocation?.lat != null && profileLocation?.lng != null) {
      setCurrentLocation({
        lat: Number(profileLocation.lat),
        lng: Number(profileLocation.lng),
      });
    }
  }, [auth?.user?.current_location?.lat, auth?.user?.current_location?.lng, auth?.user?.location?.lat, auth?.user?.location?.lng, tracking]);

  useEffect(() => {
    if (!tracking) return;
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            sendLocationToBackend(loc.lat, loc.lng);
          },
          (err) => console.error("Geolocation error:", err),
          { enableHighAccuracy: true }
        );
      }
    };
    updateLocation();
    const interval = setInterval(updateLocation, 10000);
    return () => clearInterval(interval);
  }, [tracking]);

  async function sendLocationToBackend(lat, lng) {
    try {
      await fetch('https://food-backend-d44t.onrender.com/api/volunteer/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ lat, lng })
      });
    } catch (err) { /* silent */ }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [pickupsRes, histRes, availableRes] = await Promise.all([
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/my-pickups', { headers }),
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/delivery-history', { headers }),
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/available-pickups', { headers }),
      ]);
      const pickups = await pickupsRes.json();
      const hist = await histRes.json();
      const available = await availableRes.json();
      if (Array.isArray(pickups)) setActiveDeliveries(pickups);
      if (Array.isArray(hist)) setHistoryDeliveries(hist);
      if (Array.isArray(available)) setAvailablePickups(available);
      setError("");
    } catch (err) {
      setError("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }

  async function advanceStatus(pickupId, newStatus) {
    if (newStatus === "delivered" && !window.confirm("Mark this delivery as completed?")) return;
    try {
      const url = newStatus === "delivered"
        ? `https://food-backend-d44t.onrender.com/api/volunteer/pickup/${pickupId}/deliver`
        : `https://food-backend-d44t.onrender.com/api/pickups/${pickupId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.error || data.message || "Failed to update status");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  async function claimPickup(pickupId) {
    try {
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/volunteer/pickup/${pickupId}/claim`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAll();
        setTab("active");
      } else {
        alert(data.message || data.error || "Failed to claim pickup");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  async function rejectPickup(pickupId) {
    if (!window.confirm("Are you sure you want to reject this donation?")) return;
    try {
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/volunteer/pickup/${pickupId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      const data = await res.json();
      if (res.ok) {
        setDismissedPickupIds(prev => {
          const next = Array.from(new Set([...prev, pickupId]));
          localStorage.setItem("dismissedVolunteerPickups", JSON.stringify(next));
          return next;
        });
        await fetchAll();
        alert("Donation rejected successfully");
      } else {
        alert(data.message || data.error || "Failed to reject pickup");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  function getNextStatus(current) {
    const normalized = normalizePickupStatus(current);
    const idx = STATUS_FLOW.findIndex(s => s.key === normalized);
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1];
    return null;
  }

  function getDestination(delivery) {
    if (!delivery) return null;
    if (delivery.ngoLatitude != null && delivery.ngoLongitude != null) {
      return { lat: delivery.ngoLatitude, lng: delivery.ngoLongitude };
    }
    if (delivery.ngo_location?.lat != null && delivery.ngo_location?.lng != null) {
      return delivery.ngo_location;
    }
    if (delivery.ngo_id?.location) return delivery.ngo_id.location;
    if (delivery.donation_id?.location) return delivery.donation_id.location;
    return null;
  }

  function getPickupLocation(delivery) {
    if (!delivery) return null;
    if (delivery.pickupLatitude != null && delivery.pickupLongitude != null) {
      return { lat: delivery.pickupLatitude, lng: delivery.pickupLongitude };
    }
    if (delivery.pickup_location?.lat != null && delivery.pickup_location?.lng != null) {
      return delivery.pickup_location;
    }
    return delivery.donation_id?.location || null;
  }

  function getNgoDestinationText(delivery) {
    if (!delivery) return "Destination";
    if (delivery.ngoAddress) return delivery.ngoAddress;
    if (delivery.ngo_id?.address) return delivery.ngo_id.address;
    if (delivery.ngo_id?.location) {
      const { lat, lng } = delivery.ngo_id.location;
      if (lat != null && lng != null) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return delivery.ngo_id?.name || "Destination";
  }

  function getExpiryUrgency(expiryTime) {
    if (!expiryTime) return null;
    const diff = (new Date(expiryTime) - Date.now()) / 3600000;
    if (diff <= 0) return { label: "Expired", cls: "urgency-expired" };
    if (diff <= 2) return { label: `${Math.round(diff * 60)}min left`, cls: "urgency-critical" };
    if (diff <= 6) return { label: `${diff.toFixed(1)}h left`, cls: "urgency-warning" };
    return { label: `${diff.toFixed(1)}h left`, cls: "urgency-ok" };
  }

  const primaryDelivery = activeDeliveries.find((delivery) => delivery._id === selectedDelivery) || activeDeliveries[0] || null;
  const heroDelivery = primaryDelivery || availablePickups.find((pickup) => !dismissedPickupIds.includes(pickup._id)) || historyDeliveries[0] || null;
  const heroPickupLocation = getPickupLocation(heroDelivery);
  const primaryDestination = getDestination(primaryDelivery);
  const heroDestination = getDestination(heroDelivery);
  const normalizedHeroStatus = heroDelivery ? normalizePickupStatus(heroDelivery.status) : null;
  const isAssignedRoute = heroDelivery && normalizedHeroStatus === 'assigned' && heroPickupLocation;
  const isPickedOrDeliveredRoute = heroDelivery && (normalizedHeroStatus === 'picked' || normalizedHeroStatus === 'delivered') && heroPickupLocation && heroDestination;
  const routeTarget = isAssignedRoute ? heroPickupLocation : heroDestination;

  useEffect(() => {
    let cancelled = false;

    async function fetchRoadRoute() {
        // For picked/delivered deliveries we want donor->NGO route even when not tracking.
        if (!isPickedOrDeliveredRoute && (!tracking || !currentLocation || !routeTarget)) {
        setRoadRoute([]);
        setRoadRouteInfo(null);
        return;
      }

        const start = isPickedOrDeliveredRoute
        ? `${heroPickupLocation.lng},${heroPickupLocation.lat}`
        : `${currentLocation.lng},${currentLocation.lat}`;
        const end = isPickedOrDeliveredRoute
        ? `${heroDestination.lng},${heroDestination.lat}`
        : `${routeTarget.lng},${routeTarget.lat}`;

      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?alternatives=true&overview=full&geometries=geojson&steps=false`);
        if (!res.ok) throw new Error("Route lookup failed");

        const data = await res.json();
        const bestRoute = Array.isArray(data?.routes)
          ? [...data.routes].filter((route) => Array.isArray(route?.geometry?.coordinates)).sort((left, right) => {
              const leftDistance = Number.isFinite(left?.distance) ? left.distance : Number.POSITIVE_INFINITY;
              const rightDistance = Number.isFinite(right?.distance) ? right.distance : Number.POSITIVE_INFINITY;
              return leftDistance - rightDistance;
            })[0]
          : null;
        const coordinates = bestRoute?.geometry?.coordinates || data?.routes?.[0]?.geometry?.coordinates;
        const routePoints = Array.isArray(coordinates)
          ? coordinates.map(([lng, lat]) => [lat, lng])
          : [];

        if (!cancelled) {
          setRoadRoute(routePoints);
          setRoadRouteInfo(bestRoute
            ? {
                distanceKm: bestRoute.distance != null ? bestRoute.distance / 1000 : null,
                durationMinutes: bestRoute.duration != null ? Math.max(1, Math.ceil(bestRoute.duration / 60)) : null,
              }
            : null);
        }
      } catch (err) {
        if (!cancelled) {
          setRoadRoute([]);
          setRoadRouteInfo(null);
        }
      }
    }

    fetchRoadRoute();

    return () => {
      cancelled = true;
    };
  }, [tracking, currentLocation?.lat, currentLocation?.lng, routeTarget?.lat, routeTarget?.lng, heroPickupLocation?.lat, heroPickupLocation?.lng, heroDestination?.lat, heroDestination?.lng, normalizedHeroStatus]);

  const visibleAvailablePickups = availablePickups.filter((pickup) => !dismissedPickupIds.includes(pickup._id));
  const primaryDistance = roadRouteInfo?.distanceKm ?? (currentLocation && primaryDestination
    ? calculateDistance(currentLocation.lat, currentLocation.lng, primaryDestination.lat, primaryDestination.lng)
    : null);
  const primaryEtaMinutes = roadRouteInfo?.durationMinutes ?? (primaryDistance != null ? Math.max(5, Math.ceil(primaryDistance * 2)) : null);
  const primaryUrgency = getExpiryUrgency(primaryDelivery?.donation_id?.expiry_time);
  const heroUrgency = getExpiryUrgency(heroDelivery?.donation_id?.expiry_time);

  if (!auth?.isLoggedIn) {
    return <div className="vd-page"><p>Please log in to view deliveries.</p></div>;
  }

  if (loading) {
    return <div className="vd-page"><div className="vd-loading"><div className="vd-spinner" /><p>Loading your dashboard...</p></div></div>;
  }

  return (
    <div className="vd-page">
      {/* Header */}
      <div className="vd-header">
        <div className="vd-header-left">
          <h1>{"\uD83D\uDE9A"} My Deliveries</h1>
          <p className="vd-subtitle">Track your pickups and manage deliveries in real-time.</p>
        </div>
        <div className="vd-header-right">
          {tracking ? (
            <div className="vd-tracking-active">
              <span className="vd-live-dot" />
              <span>Live Tracking</span>
              <button className="vd-btn vd-btn-danger" onClick={() => setTracking(false)}>Stop</button>
            </div>
          ) : (
            <button className="vd-btn vd-btn-blue" onClick={() => setTracking(true)}>
              {"\uD83D\uDCCD"} Start Tracking
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Overview */}
      {primaryDelivery ? (
        <div className="vd-overview-layout">
          <aside className="vd-overview-card">
            <h2>Delivery Overview</h2>

            <div className="vd-overview-stat">
              <span className="vd-overview-label">Distance</span>
              <strong>{primaryDistance != null ? `${primaryDistance.toFixed(1)} km` : "--"}</strong>
            </div>

            <div className="vd-overview-stat">
              <span className="vd-overview-label">Estimated Time</span>
              <strong>{primaryEtaMinutes != null ? `${primaryEtaMinutes} min` : "--"}</strong>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">From (Pickup)</span>
              <p>{primaryDelivery.donation_id?.address || "N/A"}</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">Donor Phone</span>
              <p>{primaryDelivery.donation_id?.donor_id?.phone || "N/A"}</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">To (Drop-off)</span>
              <p>{getNgoDestinationText(primaryDelivery)}</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">NGO Phone</span>
              <p>{primaryDelivery.ngo_id?.phone || "N/A"}</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">Donation Type</span>
              <p>{primaryDelivery.donation_id?.food_type || "General donation"}</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">Servings</span>
              <p>{primaryDelivery.donation_id?.quantity || "?"} servings</p>
            </div>

            <div className="vd-overview-block">
              <span className="vd-overview-label">Last Updated</span>
              <p>{timeAgo(primaryDelivery.updatedAt)}</p>
            </div>

            {primaryUrgency && (
              <div className="vd-overview-chip-row">
                <span className={`vd-urgency ${primaryUrgency.cls}`}>{primaryUrgency.label}</span>
              </div>
            )}
          </aside>

          {((tracking && currentLocation) || isPickedOrDeliveredRoute) ? (
            <>
              <MapContainer
                center={isPickedOrDeliveredRoute ? [ (heroPickupLocation.lat + heroDestination.lat) / 2, (heroPickupLocation.lng + heroDestination.lng) / 2 ] : [currentLocation.lat, currentLocation.lng]}
                zoom={14}
                style={{ height: '800px', width: '100%', borderRadius: '14px', overflow: 'hidden', position: 'sticky', top: 0, zIndex: 10 }}
              >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                      {!isPickedOrDeliveredRoute && currentLocation && (
                        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={volunteerIcon}>
                          <Popup><strong>{"\uD83D\uDCCD"} Your Location</strong></Popup>
                        </Marker>
                      )}
                {heroPickupLocation && (
                  <Marker position={[heroPickupLocation.lat, heroPickupLocation.lng]} icon={pickupIcon}>
                    <Popup><strong>{"\uD83C\DFE0"} Pickup:</strong> {primaryDelivery.donation_id?.address}</Popup>
                  </Marker>
                )}
                {heroDestination && (
                  <>
                    <Marker position={[heroDestination.lat, heroDestination.lng]} icon={destinationIcon}>
                      <Popup><strong>{"\uD83C\DFE2"} Drop-off:</strong> {getNgoDestinationText(primaryDelivery)}</Popup>
                    </Marker>
                    <Polyline
                      positions={
                        roadRoute.length > 1
                          ? roadRoute
                          : (isPickedOrDeliveredRoute
                              ? [[heroPickupLocation.lat, heroPickupLocation.lng], [heroDestination.lat, heroDestination.lng]]
                              : [[currentLocation.lat, currentLocation.lng], [routeTarget?.lat, routeTarget?.lng]])
                      }
                      color="#2f80ed"
                      weight={4}
                      dashArray={roadRoute.length > 1 ? undefined : "8, 8"}
                    />
                  </>
                )}
                <FitMapBounds points={isPickedOrDeliveredRoute ? [heroPickupLocation, heroDestination] : [currentLocation, heroPickupLocation, routeTarget]} />
              </MapContainer>
              {!heroPickupLocation && (
                <div className="vd-map-note">Pickup location not stored for this donation. Showing the pickup address in the overview instead.</div>
              )}
            </>
          ) : (
            <div className="vd-map-placeholder">
              <div>
                <h3>Live map is ready</h3>
                <p>Start tracking to load your position and route details here.</p>
                {!tracking && <button className="vd-btn vd-btn-green" onClick={() => setTracking(true)}>Start Tracking</button>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="vd-overview-layout">
          <aside className="vd-overview-card">
            <h2>No active delivery</h2>
            <p style={{ marginTop: '0.75rem', lineHeight: 1.6 }}>
              You do not have an active pickup right now. Open <strong>Available Pickups</strong> to claim one when NGOs approve donations.
            </p>
            <div className="vd-overview-chip-row" style={{ marginTop: '1rem' }}>
              <button className="vd-btn vd-btn-green" onClick={() => setTab("available")}>
                View Available Pickups
              </button>
            </div>
          </aside>

          <div className="vd-map-wrapper vd-map-wrapper-hero">
            <div className="vd-map-placeholder">
              <div>
                <h3>Waiting for your next pickup</h3>
                <p>There is no active delivery to track yet. Claim a pickup to see distance, route, and live progress here.</p>
                <button className="vd-btn vd-btn-green" onClick={() => setTab("available")}>
                  Go to Available Pickups
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="vd-tabs">
        <button className={`vd-tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          Active ({activeDeliveries.length})
        </button>
        <button className={`vd-tab ${tab === "available" ? "active" : ""}`} onClick={() => setTab("available")}>
          Available Pickups ({visibleAvailablePickups.length})
        </button>
        <button className={`vd-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          History ({historyDeliveries.length})
        </button>
      </div>

      {/* Available Tab */}
      {tab === "available" && (
        <div className="vd-deliveries">
          {visibleAvailablePickups.length === 0 ? (
            <div className="vd-empty">
              <span className="vd-empty-icon">{"\uD83D\uDCE6"}</span>
              <p>No pickups available right now</p>
              <span className="vd-empty-sub">This tab only shows claimable pickups. Accepted donations will appear here when NGOs approve them.</span>
            </div>
          ) : (
            visibleAvailablePickups.map((pickup) => {
              const urgency = getExpiryUrgency(pickup.donation_id?.expiry_time);
              return (
                <div key={pickup._id} className="vd-card">
                  <div className="vd-card-top">
                    <div className="vd-card-main">
                      <h3>{pickup.donation_id?.food_name || "Food Donation"}</h3>
                      <div className="vd-card-meta">
                        <span className="vd-qty">{pickup.donation_id?.quantity || "?"} servings</span>
                        {urgency && <span className={`vd-urgency ${urgency.cls}`}>{urgency.label}</span>}
                      </div>
                      <div className="vd-card-extra">
                        <span className="vd-extra-line">📍 Pickup: {pickup.donation_id?.address || "N/A"}</span>
                        <span className="vd-extra-line">🏢 NGO: {pickup.ngo_id?.name || "General donation"}</span>
                      </div>
                    </div>
                    <div className="vd-card-status-col">
                      <span className="vd-status-chip status-pending">pending</span>
                    </div>
                  </div>

                  <div className="vd-card-expanded" style={{ display: "block" }}>
                    <div className="vd-detail-grid">
                      <div className="vd-detail">
                        <span className="vd-detail-label">Pickup Address</span>
                        <span className="vd-detail-value">{pickup.donation_id?.address || "N/A"}</span>
                      </div>
                      {pickup.ngo_id?.name && (
                        <div className="vd-detail">
                          <span className="vd-detail-label">Requested By</span>
                          <span className="vd-detail-value">{pickup.ngo_id.name}</span>
                        </div>
                      )}
                      {pickup.donation_id?.expiry_time && (
                        <div className="vd-detail">
                          <span className="vd-detail-label">Expiry</span>
                          <span className="vd-detail-value">{new Date(pickup.donation_id.expiry_time).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="vd-card-actions">
                      <button className="vd-btn vd-btn-green" onClick={() => claimPickup(pickup._id)}>
                        ✓ Accept Pickup
                      </button>
                      <button className="vd-btn vd-btn-danger" onClick={() => rejectPickup(pickup._id)}>
                        ✕ Reject Pickup
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Active Tab */}
      {tab === "active" && (
        <div className="vd-deliveries">
          {activeDeliveries.length === 0 ? (
            <div className="vd-empty">
              <span className="vd-empty-icon">{"\uD83D\uDCED"}</span>
              <p>No active deliveries right now</p>
              <span className="vd-empty-sub">New assignments will appear here automatically.</span>
            </div>
          ) : (
            activeDeliveries.map((delivery) => {
              const dest = getDestination(delivery);
              const isRoadRouteDelivery = heroDelivery && delivery._id === heroDelivery._id;
              const dist = isRoadRouteDelivery && roadRouteInfo?.distanceKm != null
                ? roadRouteInfo.distanceKm
                : (currentLocation && dest
                  ? calculateDistance(currentLocation.lat, currentLocation.lng, dest.lat, dest.lng)
                  : null);
              const etaMinutes = isRoadRouteDelivery && roadRouteInfo?.durationMinutes != null
                ? roadRouteInfo.durationMinutes
                : (dist != null ? Math.max(5, Math.ceil(dist * 2)) : null);
              const next = getNextStatus(delivery.status);
              const urgency = getExpiryUrgency(delivery.donation_id?.expiry_time);
              const isExpanded = selectedDelivery === delivery._id;

              return (
                <div key={delivery._id} className={`vd-card ${isExpanded ? "expanded" : ""}`}>
                  <div className="vd-card-top" onClick={() => setSelectedDelivery(isExpanded ? null : delivery._id)}>
                    <div className="vd-card-main">
                      <h3>{delivery.donation_id?.food_name || "Food Donation"}</h3>
                      <div className="vd-card-meta">
                        <span className="vd-qty">{delivery.donation_id?.quantity || "?"} servings</span>
                        {urgency && <span className={`vd-urgency ${urgency.cls}`}>{urgency.label}</span>}
                        {dist != null && <span className="vd-distance">{dist.toFixed(1)} km away</span>}
                      </div>
                      <div className="vd-card-extra">
                        <span className="vd-extra-line">📍 Pickup: {delivery.donation_id?.address || "N/A"}</span>
                        <span className="vd-extra-line">🏢 Drop-off: {getNgoDestinationText(delivery)}</span>
                        {dist != null && <span className="vd-extra-line">🛣️ Distance between you and drop: {dist.toFixed(1)} km</span>}
                      </div>
                    </div>
                    <div className="vd-card-status-col">
                      <span className={`vd-status-chip status-${delivery.status}`}>{delivery.status}</span>
                      <span className="vd-expand-icon">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="vd-card-expanded">
                      {/* Status Progress */}
                      <div className="vd-progress">
                        {STATUS_FLOW.map((step, i) => {
                          const currentIdx = STATUS_FLOW.findIndex(s => s.key === normalizePickupStatus(delivery.status));
                          const isDone = i <= currentIdx;
                          const isCurrent = i === currentIdx;
                          return (
                            <div key={step.key} className={`vd-progress-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                              <div className="vd-progress-dot">{isDone ? "\u2713" : (i + 1)}</div>
                              <span className="vd-progress-label">{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="vd-detail-grid">
                        <div className="vd-detail">
                          <span className="vd-detail-label">Pickup Address</span>
                          <span className="vd-detail-value">{delivery.donation_id?.address || "N/A"}</span>
                        </div>
                        {delivery.ngo_id?.name && (
                          <div className="vd-detail">
                            <span className="vd-detail-label">Deliver To</span>
                            <span className="vd-detail-value">{delivery.ngo_id.name}</span>
                          </div>
                        )}
                        {delivery.donation_id?.expiry_time && (
                          <div className="vd-detail">
                            <span className="vd-detail-label">Expiry</span>
                            <span className="vd-detail-value">{new Date(delivery.donation_id.expiry_time).toLocaleString()}</span>
                          </div>
                        )}
                        {etaMinutes != null && (
                          <div className="vd-detail">
                            <span className="vd-detail-label">ETA</span>
                            <span className="vd-detail-value">~{etaMinutes} min{dist != null ? ` (${dist.toFixed(1)} km)` : ""}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      {delivery.timeline && delivery.timeline.length > 0 && (
                        <div className="vd-timeline">
                          <h4>Timeline</h4>
                          {delivery.timeline.map((entry, i) => (
                            <div key={i} className="vd-timeline-entry">
                              <span className="vd-timeline-dot" />
                              <span className="vd-timeline-status">{entry.status}</span>
                              <span className="vd-timeline-time">{timeAgo(entry.updatedAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {tracking && currentLocation && (
                        <div className="vd-live-info">
                          <span>{"\uD83D\uDCE1"} Sharing live location with NGO</span>
                          <span className="vd-coords">{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
                        </div>
                      )}

                      <div className="vd-card-actions">
                        {!tracking && delivery.status !== "delivered" && (
                          <button className="vd-btn vd-btn-blue" onClick={() => setTracking(true)}>{"\uD83D\uDCCD"} Start Tracking</button>
                        )}
                        {next && (
                          <button className="vd-btn vd-btn-green" onClick={() => advanceStatus(delivery._id, next.key)}>
                            {next.icon} {next.key === "picked" ? "Mark Pickup" : "Mark Delivered"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="vd-deliveries">
          {historyDeliveries.length === 0 ? (
            <div className="vd-empty">
              <span className="vd-empty-icon">{"\uD83D\uDCCB"}</span>
              <p>No completed deliveries yet</p>
            </div>
          ) : (
            historyDeliveries.map((delivery) => (
              <div key={delivery._id} className="vd-history-card">
                <div className="vd-history-left">
                  <h4>{delivery.donation_id?.food_name || "Food Donation"}</h4>
                  <span className="vd-history-meta">
                    {delivery.donation_id?.quantity || "?"} servings &middot; {delivery.ngo_id?.name || "General"}
                  </span>
                  <span className="vd-history-addr">{delivery.donation_id?.address || ""}</span>
                </div>
                <div className="vd-history-right">
                  <span className="vd-status-chip status-delivered">Delivered</span>
                  <span className="vd-history-date">
                    {delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleDateString() : timeAgo(delivery.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
