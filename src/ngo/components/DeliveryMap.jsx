import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

// Custom marker icons
const volunteerIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
  shadowUrl: SHADOW_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ngoIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
  shadowUrl: SHADOW_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-orange.png',
  shadowUrl: SHADOW_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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
  if (status === 'scheduled') return 'assigned';
  return status;
}

export default function DeliveryMap({
  pickup,
  volunteerLocation,
  ngoLocation,
  pickupAddress,
  pickupLatitude,
  pickupLongitude,
  ngoAddress,
  ngoLatitude,
  ngoLongitude,
  pickupLocation,
  donationLocation,
}) {
  const [distance, setDistance] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [route, setRoute] = useState([]);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Default Mumbai center

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(2);
  };

  // Default fallback coordinates (Mumbai)
  const DEFAULT_LAT = 19.0760;
  const DEFAULT_LNG = 72.8777;

  // Ensure coordinates are valid numbers
  // Offset volunteer default slightly so the route line is always visible
  const volLat = volunteerLocation?.lat ?? (DEFAULT_LAT + 0.015);
  const volLng = volunteerLocation?.lng ?? (DEFAULT_LNG - 0.02);
  const ngoLat = ngoLatitude ?? ngoLocation?.lat ?? pickup?.ngoLatitude ?? DEFAULT_LAT;
  const ngoLng = ngoLongitude ?? ngoLocation?.lng ?? pickup?.ngoLongitude ?? DEFAULT_LNG;
  const pickupLat = pickupLatitude ?? pickupLocation?.lat ?? donationLocation?.lat ?? pickup?.pickupLatitude ?? pickup?.pickup_location?.lat ?? pickup?.donation_id?.location?.lat ?? DEFAULT_LAT;
  const pickupLng = pickupLongitude ?? pickupLocation?.lng ?? donationLocation?.lng ?? pickup?.pickupLongitude ?? pickup?.pickup_location?.lng ?? pickup?.donation_id?.location?.lng ?? DEFAULT_LNG;
  const normalizedStatus = normalizePickupStatus(pickup?.status);
  const afterPickupRoute = normalizedStatus === 'picked' || normalizedStatus === 'delivered';
  const routeStart = afterPickupRoute
    ? { lat: pickupLat, lng: pickupLng }
    : { lat: volLat, lng: volLng };
  const routeEnd = afterPickupRoute
    ? { lat: ngoLat, lng: ngoLng }
    : { lat: pickupLat, lng: pickupLng };

  useEffect(() => {
    let cancelled = false;

    async function fetchRoadRoute() {
      if (!Number.isFinite(routeStart.lat) || !Number.isFinite(routeStart.lng) || !Number.isFinite(routeEnd.lat) || !Number.isFinite(routeEnd.lng)) {
        setRoute([]);
        setRouteInfo(null);
        setDistance(null);
        return;
      }

      try {
        const start = `${routeStart.lng},${routeStart.lat}`;
        const end = `${routeEnd.lng},${routeEnd.lat}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?alternatives=true&overview=full&geometries=geojson&steps=false`);
        if (!res.ok) throw new Error('Route lookup failed');

        const data = await res.json();
        const bestRoute = Array.isArray(data?.routes)
          ? [...data.routes].filter((item) => Array.isArray(item?.geometry?.coordinates)).sort((left, right) => {
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
          setRoute(routePoints);
          setRouteInfo(bestRoute
            ? {
                distanceKm: bestRoute.distance != null ? bestRoute.distance / 1000 : null,
                durationMinutes: bestRoute.duration != null ? Math.max(1, Math.ceil(bestRoute.duration / 60)) : null,
              }
            : null);
          setDistance(bestRoute?.distance != null ? (bestRoute.distance / 1000).toFixed(2) : calculateDistance(routeStart.lat, routeStart.lng, routeEnd.lat, routeEnd.lng).toFixed(2));
          setMapCenter([
            (routeStart.lat + routeEnd.lat) / 2,
            (routeStart.lng + routeEnd.lng) / 2
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          const fallbackDistance = calculateDistance(routeStart.lat, routeStart.lng, routeEnd.lat, routeEnd.lng).toFixed(2);
          setRoute([
            [routeStart.lat, routeStart.lng],
            [routeEnd.lat, routeEnd.lng]
          ]);
          setRouteInfo(null);
          setDistance(fallbackDistance);
          setMapCenter([
            (routeStart.lat + routeEnd.lat) / 2,
            (routeStart.lng + routeEnd.lng) / 2
          ]);
        }
      }
    }

    fetchRoadRoute();

    return () => {
      cancelled = true;
    };
  }, [routeStart.lat, routeStart.lng, routeEnd.lat, routeEnd.lng]);

  const hasPickupLocation = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
  const hasVolunteerLocation = Number.isFinite(volLat) && Number.isFinite(volLng);
  const etaMinutes = routeInfo?.durationMinutes ?? (distance != null ? Math.ceil(Number(distance) * 2) : null);
  const mapCenterPoint = afterPickupRoute && hasPickupLocation && Number.isFinite(ngoLat) && Number.isFinite(ngoLng)
    ? [(pickupLat + ngoLat) / 2, (pickupLng + ngoLng) / 2]
    : hasVolunteerLocation
      ? [volLat, volLng]
      : [mapCenter[0], mapCenter[1]];

  return (
    <div className="delivery-map-container">
      <div className="map-wrapper">
        <MapContainer
          center={mapCenterPoint}
          zoom={14}
          style={{ height: '75vh', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          <FitMapBounds points={afterPickupRoute ? [{ lat: pickupLat, lng: pickupLng }, { lat: ngoLat, lng: ngoLng }] : [{ lat: volLat, lng: volLng }, { lat: pickupLat, lng: pickupLng }, { lat: ngoLat, lng: ngoLng }]} />

          {/* Route Line */}
          {route.length > 0 && (
            <Polyline
              positions={route}
              color="#2f80ed"
              weight={4}
              opacity={0.9}
              dashArray={routeInfo ? undefined : '10, 6'}
            />
          )}

          {/* Pickup Source Marker */}
          {hasPickupLocation && (
            <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
              <Popup>
                <div className="marker-popup">
                  <h4>📦 Pickup Point</h4>
                  <p>{pickup?.donation_id?.food_name || 'Donation pickup'}</p>
                  <p>{pickupAddress || pickup?.pickupAddress || pickup?.donation_id?.address || 'Pickup location'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Volunteer/Agent Marker */}
          {!afterPickupRoute && hasVolunteerLocation && (
            <Marker position={[volLat, volLng]} icon={volunteerIcon}>
              <Popup>
                <div className="marker-popup">
                  <h4>📍 Your Location</h4>
                  <p>Volunteer is delivering this pickup</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* NGO Destination Marker */}
          <Marker position={[ngoLat, ngoLng]} icon={ngoIcon}>
            <Popup>
              <div className="marker-popup">
                <h4>🏢 Drop-off (NGO)</h4>
                <p>{ngoAddress || ngoLocation?.name || 'NGO Location'}</p>
                <p>Distance: {distance} km</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Distance & Status Info */}
      <div className="delivery-info">
        <div className="info-card">
          <div className="info-item">
            <span className="label">Pickup to NGO Distance:</span>
            <span className="value">{distance} km</span>
          </div>
          <div className="info-item">
            <span className="label">ETA:</span>
            <span className="value">{etaMinutes != null ? `${etaMinutes} min` : '--'}</span>
          </div>
          <div className="info-item">
            <span className="label">Status:</span>
            <span className="value status-in-transit">{afterPickupRoute ? '✅ Pickup complete' : '🚴 In Transit'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
