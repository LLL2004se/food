import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ setPage }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonations: 0,
    totalRequests: 0,
    totalPickups: 0,
    pendingDonations: 0,
    activePickups: 0,
    completedDeliveries: 0,
    activeDeliveries: 0,
    averageDeliveryTime: 0,
  });

  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState(null);

  const [locationInsights, setLocationInsights] = useState([
    { location: 'Andheri', demand: 0 },
    { location: 'Dadar', demand: 0 },
    { location: 'Kurla', demand: 0 },
  ]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const getDemandPredictionValue = (data) => {
    const value = Number(data?.prediction);
    return Number.isFinite(value) ? value : null;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
       .then(async (res) => {
         const data = await res.json();
         setStats(data);

         // Fetch demand prediction
         const fetchDemandPrediction = async () => {
           setInsightsLoading(true);
           setPredictionError(null);
           try {
             const response = await fetch('http://localhost:5000/api/ai/predict-demand', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
               body: JSON.stringify({
                 donation_count: data.totalDonations,
                 ngo_requests: data.totalRequests,
                 month: new Date().getMonth() + 1,
               }),
             });
             const predictionData = await response.json();
             setPrediction(predictionData);

             // Calculate location-based insights
             const totalDemand = getDemandPredictionValue(predictionData) ?? 100;
             const insights = [
               { location: 'Andheri', demand: Math.round(totalDemand * 0.4) },
               { location: 'Dadar', demand: Math.round(totalDemand * 0.5) },
               { location: 'Kurla', demand: Math.round(totalDemand * 0.3) },
             ];
             setLocationInsights(insights);
           } catch (err) {
             console.log("Error fetching prediction:", err);
             setPredictionError("Unable to load prediction");
           } finally {
             setInsightsLoading(false);
           }
         };

         fetchDemandPrediction();
       })
       .catch(err => console.log("Error fetching stats:", err));
    
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: "👥",
      color: "bg-blue-500",
    },
    {
      title: "Total Donations",
      value: stats.totalDonations,
      icon: "📦",
      color: "bg-green-500",
    },
    {
      title: "Total Requests",
      value: stats.totalRequests,
      icon: "📋",
      color: "bg-yellow-500",
    },
    {
      title: "Total Pickups",
      value: stats.totalPickups,
      icon: "🚚",
      color: "bg-purple-500",
    },
    {
      title: "Active Deliveries",
      value: stats.activeDeliveries,
      icon: "📍",
      color: "bg-red-500",
    },
    {
      title: "Completed Deliveries",
      value: stats.completedDeliveries,
      icon: "✅",
      color: "bg-emerald-500",
    },
    {
      title: "Avg Delivery Time",
      value: `${stats.averageDeliveryTime}h`,
      icon: "⏱️",
      color: "bg-cyan-500",
    },
    {
      title: "Pending Donations",
      value: stats.pendingDonations,
      icon: "⏳",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="admin-page-header admin-header-shell mb-6">
        <div>
          <h1 className="admin-text text-3xl font-bold">Admin Dashboard</h1>
          <p className="admin-text-muted mt-2">Overview of Food-Print platform</p>
        </div>
      </div>

      <div className="admin-dashboard-grid admin-dashboard-grid-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="admin-card-bg admin-stat-card admin-border rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="admin-text-muted text-sm font-medium">
                  {card.title}
                </p>
                <p className="admin-text text-3xl font-bold mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} admin-stat-icon`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 admin-card-bg admin-report-card admin-border border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="admin-text admin-section-heading">AI Demand Prediction</h2>
            <p className="admin-section-subheading mt-1">Live prediction snapshot from the AI service</p>
          </div>

        </div>
        {predictionError ? (
          <p className="admin-text-muted text-sm">{predictionError}</p>
        ) : prediction ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="admin-insight-card p-4 rounded-lg border border-purple-500 border-opacity-30 bg-purple-500 bg-opacity-5">
              <p className="admin-text-muted text-sm mb-2">Predicted Demand</p>
              <p className="admin-text text-4xl font-bold">
                {(() => {
                  const value = getDemandPredictionValue(prediction);
                  return value === null ? 'N/A' : Math.round(value);
                })()}
              </p>
              <p className="admin-text-muted text-xs mt-2">
                Based on current donations and requests
              </p>
            </div>
            <div className="admin-insight-card p-4 rounded-lg border border-indigo-500 border-opacity-30 bg-indigo-500 bg-opacity-5">
              <p className="admin-text-muted text-sm mb-2">Current Month</p>
              <p className="admin-text text-3xl font-bold">
                {new Date().toLocaleString('default', { month: 'long' })}
              </p>
              <p className="admin-text-muted text-xs mt-2">
                Input: {stats.totalDonations} donations, {stats.totalRequests} requests
              </p>
            </div>
          </div>
        ) : (
          <p className="admin-text-muted">Loading prediction...</p>
        )}
      </div>

      <div className="mt-8 admin-card-bg admin-report-card admin-border border">
        <h2 className="admin-text admin-section-heading mb-2">AI Insights - Predicted Demand by Location</h2>
        <p className="admin-section-subheading mb-6">Expected demand concentrated by service area</p>
        {insightsLoading ? (
          <p className="admin-text-muted">Loading insights...</p>
        ) : (
          <div className="admin-dashboard-grid">
            {locationInsights.map((insight, index) => (
              <div
                key={index}
                className="admin-insight-card p-6 rounded-lg border border-cyan-500 border-opacity-30 bg-cyan-500 bg-opacity-5 hover:bg-opacity-10 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="admin-text-muted text-sm font-medium">{insight.location}</p>
                  <span className="text-2xl">📍</span>
                </div>
                <p className="admin-text text-4xl font-bold">{insight.demand}</p>
                <p className="admin-text-muted text-xs mt-2">Expected meals needed</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 admin-card-bg admin-report-card admin-border border">
        <h2 className="admin-text admin-section-heading mb-2">Delivery Tracking Metrics</h2>
        <p className="admin-section-subheading mb-6">Operational snapshot across the logistics pipeline</p>
        <div className="admin-dashboard-grid admin-dashboard-grid-4">
          <div className="admin-insight-card p-4 rounded-lg border border-green-500 border-opacity-30 bg-green-500 bg-opacity-5">
            <p className="admin-text-muted text-sm mb-2">Total Donations</p>
            <p className="admin-text text-4xl font-bold">{stats.totalDonations}</p>
            <p className="admin-text-muted text-xs mt-2">All donations in system</p>
          </div>
          <div className="admin-insight-card p-4 rounded-lg border border-yellow-500 border-opacity-30 bg-yellow-500 bg-opacity-5">
            <p className="admin-text-muted text-sm mb-2">Active Deliveries</p>
            <p className="admin-text text-4xl font-bold">{stats.activeDeliveries}</p>
            <p className="admin-text-muted text-xs mt-2">In progress now</p>
          </div>
          <div className="admin-insight-card p-4 rounded-lg border border-green-500 border-opacity-30 bg-green-500 bg-opacity-5">
            <p className="admin-text-muted text-sm mb-2">Completed Deliveries</p>
            <p className="admin-text text-4xl font-bold">{stats.completedDeliveries}</p>
            <p className="admin-text-muted text-xs mt-2">Successfully delivered</p>
          </div>
          <div className="admin-insight-card p-4 rounded-lg border border-blue-500 border-opacity-30 bg-blue-500 bg-opacity-5">
            <p className="admin-text-muted text-sm mb-2">Avg Delivery Time</p>
            <p className="admin-text text-4xl font-bold">{stats.averageDeliveryTime}h</p>
            <p className="admin-text-muted text-xs mt-2">From pickup to delivery</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="admin-card-bg admin-summary-card admin-border border">
          <h2 className="admin-text text-xl font-semibold mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 admin-activity-item">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="admin-activity-item-text">
                <p className="admin-text text-sm">New donation created</p>
                <p className="admin-text-muted text-xs">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 admin-activity-item">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="admin-activity-item-text">
                <p className="admin-text text-sm">New user registered</p>
                <p className="admin-text-muted text-xs">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 admin-activity-item">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="admin-activity-item-text">
                <p className="admin-text text-sm">Pickup completed</p>
                <p className="admin-text-muted text-xs">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card-bg admin-summary-card admin-border border">
          <h2 className="admin-text text-xl font-semibold mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-users")}
            >
              👥 View All Users
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-donations")}
            >
              📦 Manage Donations
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-requests")}
            >
              📝 Review Requests
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-pickups")}
            >
              🚚 Track Pickups
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-ngo-requests")}
            >
              🏢 Manage NGOs
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-notifications")}
            >
              🔔 Notifications
            </button>
            <button
              className="admin-card-bg admin-text w-full px-4 py-2 text-left text-sm font-medium rounded-lg hover:opacity-90"
              onClick={() => setPage("admin-ai-analytics")}
            >
              🤖 AI Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
