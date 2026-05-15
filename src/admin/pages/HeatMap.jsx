import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix Leaflet default icon issue with Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function HeatMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([19.0760, 72.8777], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    }

    // Update heat layer when data changes
    if (heatmapData.length > 0) {
      if (heatLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
      }

      const maxScore = Math.max(...heatmapData.map(d => d.demand_score));

      // Spread each data point into multiple nearby points to create area coverage
      const points = [];
      heatmapData.forEach(d => {
        const intensity = d.demand_score / (maxScore || 1);
        const spread = 0.012; // ~1.2km spread around each center
        const steps = 8;
        // Center point (strongest)
        points.push([d.lat, d.lng, intensity]);
        // Ring of surrounding points for area coverage
        for (let i = 0; i < steps; i++) {
          const angle = (2 * Math.PI * i) / steps;
          points.push([
            d.lat + spread * Math.cos(angle),
            d.lng + spread * Math.sin(angle),
            intensity * 0.7,
          ]);
          // Outer ring for softer edges
          points.push([
            d.lat + spread * 1.8 * Math.cos(angle),
            d.lng + spread * 1.8 * Math.sin(angle),
            intensity * 0.35,
          ]);
        }
      });

      heatLayerRef.current = L.heatLayer(points, {
        radius: 50,
        blur: 35,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.15: '#0400ff',
          0.3: '#00b4ff',
          0.45: '#00ff6e',
          0.6: '#c6ff00',
          0.8: '#ffa200',
          1.0: '#ff0000',
        },
      }).addTo(mapInstanceRef.current);

      // Add small circle markers with labels (no pin markers)
      heatmapData.forEach(d => {
        L.circleMarker([d.lat, d.lng], {
          radius: 5,
          color: '#fff',
          weight: 2,
          fillColor: '#ff4444',
          fillOpacity: 0.9,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>${d.area}</b><br>Demand Score: ${d.demand_score}`);
      });
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
      }
    };
  }, [heatmapData]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('https://food-backend-d44t.onrender.com/api/ai/heatmap-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch heatmap data');
      const data = await res.json();
      setHeatmapData(data);
    } catch (err) {
      console.error('Heatmap fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-heatmap-shell">
      {loading && <p className="admin-text text-center py-4">Loading heatmap data...</p>}
      {error && (
        <p className="text-red-500 text-center py-4">
          {error} — Make sure the AI server is running and heatmap data is generated.
        </p>
      )}
      <div
        ref={mapRef}
        className="admin-heatmap-map"
      />
      {heatmapData.length > 0 && (
        <div className="admin-heatmap-grid">
          {heatmapData.map((d, i) => (
            <div key={i} className="admin-card-bg admin-heatmap-card admin-border p-3 rounded-lg border text-center">
              <p className="admin-text font-semibold text-sm">{d.area}</p>
              <p className="admin-text text-lg font-bold">{d.demand_score}</p>
              <p className="admin-text-muted text-xs">demand score</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
