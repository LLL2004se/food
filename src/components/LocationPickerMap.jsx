import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

function isValidLocation(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function toLocation(result) {
  const lat = Number(result?.y ?? result?.lat);
  const lng = Number(result?.x ?? result?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function splitLabel(label = '') {
  return String(label)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeAddressParts(address = {}, label = '') {
  const pick = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || '';
  const labelParts = splitLabel(label);
  const buildingFallback = labelParts[0] || '';

  return {
    building: pick(
      address.building,
      address.premise,
      address.amenity,
      address.shop,
      address.house_number,
      buildingFallback
    ),
    block: pick(
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.borough,
      address.locality,
      address.village,
      address.town,
      address.city
    ),
    city: pick(address.city, address.town, address.village, address.municipality, address.county, address.state_district),
  };
}

async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'food-rescue-app/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      address: normalizeAddressParts(data.address || {}, data.display_name || ''),
      label: data.display_name || '',
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

function SearchResults({ results, onPickResult }) {
  if (!results.length) return null;

  return (
    <div style={{ position: 'absolute', zIndex: 1000, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderTop: 'none', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
      {results.map((result) => (
        <button
          type="button"
          key={`${result.label}-${result.x}-${result.y}`}
          onClick={() => onPickResult(result)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.8rem 1rem', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#fff', cursor: 'pointer' }}
        >
          <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{result.label}</strong>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>{Number(result.y).toFixed(6)}, {Number(result.x).toFixed(6)}</span>
        </button>
      ))}
    </div>
  );
}

export default function LocationPickerMap({
  value,
  onChange,
  onLocationSelect,
  title = 'Precise location',
  helpText = 'Click on the map to set the exact location.',
  height = '280px',
  defaultCenter = [19.076, 72.8777],
}) {
  const provider = useMemo(() => new OpenStreetMapProvider(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [resolvedLabel, setResolvedLabel] = useState('');
  const searchTimer = useRef(null);
  const hasValue = isValidLocation(value);
  const lat = hasValue ? Number(value.lat) : defaultCenter[0];
  const lng = hasValue ? Number(value.lng) : defaultCenter[1];

  useEffect(() => () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
  }, []);

  const emitSelection = async (location, label = '') => {
    const resolved = await reverseGeocode(location.lat, location.lng);
    const nextAddress = resolved?.address || null;
    const nextLabel = resolved?.label || label || '';

    setResolvedLabel(nextLabel);
    if (typeof onChange === 'function') {
      onChange(location);
    }
    if (typeof onLocationSelect === 'function') {
      onLocationSelect({ location, address: nextAddress, label: nextLabel });
    }
  };

  const handleMapPick = (location) => {
    emitSelection(location);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) {
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const matches = await provider.search({ query: nextQuery });
      setResults(matches.slice(0, 6));
      if (matches.length === 1) {
        const selected = matches[0];
        const location = toLocation(selected);
        if (location) {
          await emitSelection(location, selected.label);
          setResults([]);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Search failed. Try another address.');
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = async (result) => {
    const location = toLocation(result);
    if (!location) return;

    setResults([]);
    setQuery(result.label);

    const nextLabel = result.label || result.raw?.display_name || '';
    const nextAddress = normalizeAddressParts(result.raw?.address || {}, nextLabel);

    setResolvedLabel(nextLabel);
    if (typeof onChange === 'function') {
      onChange(location);
    }
    if (typeof onLocationSelect === 'function') {
      onLocationSelect({ location, address: nextAddress, label: nextLabel });
    }
  };

  const handleUseCurrentLocation = () => {
    setLocationStatus('');

    if (!navigator.geolocation) {
      setLocationStatus('Current location is not supported in this browser.');
      return;
    }

    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setResults([]);
        setQuery('');
        await emitSelection(location, 'Current location');
        setLocationStatus('Current location selected.');
        setSearching(false);
      },
      (error) => {
        console.error('Current location failed:', error);
        setLocationStatus(error.message || 'Unable to get current location.');
        setSearching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div style={{ marginTop: '1rem', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{title}</strong>
        <span style={{ fontSize: '0.92rem', color: '#666' }}>{helpText}</span>
      </div>
      <form onSubmit={handleSearch} style={{ position: 'relative', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setSearchError('');
              if (searchTimer.current) {
                clearTimeout(searchTimer.current);
              }
              searchTimer.current = setTimeout(async () => {
                const trimmed = nextQuery.trim();
                if (!trimmed) {
                  setResults([]);
                  return;
                }

                setSearching(true);
                try {
                  const matches = await provider.search({ query: trimmed });
                  setResults(matches.slice(0, 6));
                } catch (error) {
                  console.error('Search failed:', error);
                  setSearchError('Search failed. Try another address.');
                } finally {
                  setSearching(false);
                }
              }, 400);
            }}
            placeholder="Search an address, landmark, or area"
            style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.98rem' }}
          />
          <button type="submit" style={{ padding: '0.85rem 1rem', borderRadius: '12px', border: 'none', background: '#1f5eff', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button type="button" onClick={handleUseCurrentLocation} style={{ padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(31,94,255,0.25)', background: '#fff', color: '#1f5eff', fontWeight: 700, cursor: 'pointer' }}>
            Use current location
          </button>
        </div>
        <SearchResults results={results} onPickResult={handlePickResult} />
        {searchError ? <div style={{ marginTop: '0.65rem', color: '#c0392b', fontSize: '0.9rem' }}>{searchError}</div> : null}
        {locationStatus ? <div style={{ marginTop: '0.65rem', color: '#444', fontSize: '0.9rem' }}>{locationStatus}</div> : null}
      </form>
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat, lng]}
        zoom={hasValue ? 15 : 12}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapClickHandler onPick={handleMapPick} />
        <Marker position={[lat, lng]} icon={selectedIcon}>
          <Popup>
            {resolvedLabel || (hasValue ? `Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Click anywhere to choose a location')}
          </Popup>
        </Marker>
      </MapContainer>
      <div style={{ padding: '0.85rem 1rem', fontSize: '0.92rem', color: '#444' }}>
        {hasValue ? (
          <span>Saved coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}{resolvedLabel ? ` · ${resolvedLabel}` : ''}</span>
        ) : (
          <span>No coordinates selected yet.</span>
        )}
      </div>
    </div>
  );
}