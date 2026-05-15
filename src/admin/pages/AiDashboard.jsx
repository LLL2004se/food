import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import HeatMap from './HeatMap';

export default function AiDashboard() {
  const [donationsData, setDonationsData] = useState(null);
  const [requestsData, setRequestsData] = useState(null);
  const [foodTypeData, setFoodTypeData] = useState(null);
  const [locationDemand, setLocationDemand] = useState([
    { location: 'Andheri', demand: 120 },
    { location: 'Dadar', demand: 95 },
    { location: 'Bandra', demand: 140 },
  ]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalRequests: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch admin stats
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Fetch all donations for analysis
      const donationsRes = await fetch('http://localhost:5000/api/admin/donations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!donationsRes.ok) {
        throw new Error('Failed to fetch admin donations');
      }
      const donations = await donationsRes.json();

      // Fetch all requests for the comparison chart
      const requestsRes = await fetch('http://localhost:5000/api/admin/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!requestsRes.ok) {
        throw new Error('Failed to fetch admin requests');
      }
      const requests = await requestsRes.json();
      
      // Process donations by month
      const monthData = {};
      const requestMonthData = {};
      const foodTypes = {};

      const getMonthLabel = (value) => {
        const date = value ? new Date(value) : new Date();
        return date.toLocaleString('default', { month: 'short' });
      };
      
      donations.forEach(d => {
        // Get month from createdAt
        const month = getMonthLabel(d.createdAt);
        const foodName = d.food_name || 'Other';
        
        // Count donations per month
        monthData[month] = (monthData[month] || 0) + d.quantity;
        
        // Count food types
        foodTypes[foodName] = (foodTypes[foodName] || 0) + 1;
      });

      requests.forEach(request => {
        const month = getMonthLabel(request.createdAt);
        requestMonthData[month] = (requestMonthData[month] || 0) + 1;
      });
      
      // Prepare donations per month chart
      const months = Array.from(new Set([
        ...Object.keys(monthData),
        ...Object.keys(requestMonthData),
      ]));
      setDonationsData({
        labels: months.length > 0 ? months : ['No Data'],
        datasets: [
          {
            label: 'Donations (Quantity)',
            data: months.length > 0 ? months.map(month => monthData[month] || 0) : [0],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
          },
        ],
      });
      
      // Prepare requests vs donations comparison
      const monthlyDonations = months.length > 0 ? months.map(month => monthData[month] || 0) : [0];
      const monthlyRequests = months.length > 0 ? months.map(month => requestMonthData[month] || 0) : [0];
      
      setRequestsData({
        labels: months.length > 0 ? months : ['No Data'],
        datasets: [
          {
            label: 'Donations',
            data: monthlyDonations,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
          },
          {
            label: 'NGO Requests',
            data: monthlyRequests,
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 2,
          },
        ],
      });
      
      // Prepare food type distribution
      const foodNames = Object.keys(foodTypes);
      setFoodTypeData({
        labels: foodNames.length > 0 ? foodNames : ['No Data'],
        datasets: [
          {
            label: 'Food Type Count',
            data: foodNames.length > 0 ? Object.values(foodTypes) : [0],
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 2,
          },
        ],
      });
      
      // Fetch AI prediction for location demand
      try {
        const predictionRes = await fetch('http://localhost:5000/api/ai/predict-demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donation_count: statsData.totalDonations,
            ngo_requests: statsData.totalRequests,
            month: new Date().getMonth() + 1,
          }),
        });
        const predictionData = await predictionRes.json();
        
        // Update location demand based on prediction
        const totalPrediction = predictionData.prediction || 355;
        setLocationDemand([
          { location: 'Andheri', demand: Math.round(totalPrediction * 0.34) },
          { location: 'Dadar', demand: Math.round(totalPrediction * 0.27) },
          { location: 'Bandra', demand: Math.round(totalPrediction * 0.39) },
        ]);
      } catch (err) {
        console.log('Error fetching AI prediction:', err);
      }
    } catch (err) {
      console.log('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="admin-page-header admin-header-shell mb-6">
        <div>
          <h1 className="admin-text text-3xl font-bold">AI Analytics Dashboard</h1>
          <p className="admin-text-muted mt-2">Data insights and predictions</p>
        </div>
        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="admin-primary-btn mt-4"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {loading ? (
        <div className="admin-text text-center py-8">Loading analytics...</div>
      ) : (
        <>
          {/* Donations per Month Chart */}
          <div className="mt-8 admin-card-bg admin-chart-card admin-border border">
            <h2 className="admin-text admin-section-heading mb-2">Donations per Month</h2>
            <p className="admin-section-subheading mb-6">Monthly volume of donations by quantity</p>
            {donationsData ? (
              <Bar data={donationsData} options={chartOptions} height={80} />
            ) : (
              <p className="admin-text-muted">No data available</p>
            )}
          </div>

          {/* NGO Requests vs Donations */}
          <div className="mt-8 admin-card-bg admin-chart-card admin-border border">
            <h2 className="admin-text admin-section-heading mb-2">
              NGO Requests vs Donations
            </h2>
            <p className="admin-section-subheading mb-6">Side-by-side comparison across the same periods</p>
            {requestsData ? (
              <Bar data={requestsData} options={chartOptions} height={80} />
            ) : (
              <p className="admin-text-muted">No data available</p>
            )}
          </div>

          {/* AI Predicted Demand by Location */}
          <div className="mt-8 admin-card-bg admin-chart-card admin-border border">
            <h2 className="admin-text admin-section-heading mb-2">
              AI Predicted Demand by Location
            </h2>
            <p className="admin-section-subheading mb-6">Projected meals needed by service area</p>
            <div className="admin-dashboard-grid">
              {locationDemand.map((item, index) => (
                <div
                  key={index}
                  className="admin-insight-card p-6 rounded-lg border border-purple-500 border-opacity-30 bg-purple-500 bg-opacity-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="admin-text-muted text-sm font-medium">{item.location}</p>
                    <span className="text-2xl">📍</span>
                  </div>
                  <p className="admin-text text-4xl font-bold">{item.demand}</p>
                  <p className="admin-text-muted text-xs mt-2">meals needed</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demand Heatmap */}
          <div className="mt-8 admin-card-bg admin-heatmap-card admin-border border">
            <h2 className="admin-text admin-section-heading mb-2">🔥 Demand Heatmap</h2>
            <p className="admin-section-subheading mb-4">Geographic visualization of food demand across areas</p>
            <HeatMap />
          </div>

          {/* Food Type Distribution */}
          <div className="mt-8 admin-card-bg admin-chart-card admin-border border">
            <h2 className="admin-text admin-section-heading mb-2">Food Type Distribution</h2>
            <p className="admin-section-subheading mb-6">Breakdown of donated food categories</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                {foodTypeData ? (
                  <Doughnut data={foodTypeData} options={chartOptions} height={80} />
                ) : (
                  <p className="admin-text-muted">No data available</p>
                )}
              </div>
              <div className="admin-text-muted">
                <p className="text-sm mb-4">Food types donated:</p>
                {foodTypeData?.labels.map((label, index) => (
                  <div key={index} className="flex justify-between text-sm py-2 border-b border-gray-700">
                    <span>{label}</span>
                    <span className="font-semibold">
                      {foodTypeData?.datasets[0]?.data[index]} items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-8 admin-dashboard-grid">
            <div className="admin-card-bg admin-summary-card admin-border border">
              <p className="admin-text-muted text-sm mb-2">Total Donations</p>
              <p className="admin-text text-4xl font-bold">{stats.totalDonations}</p>
            </div>
            <div className="admin-card-bg admin-summary-card admin-border border">
              <p className="admin-text-muted text-sm mb-2">Total NGO Requests</p>
              <p className="admin-text text-4xl font-bold">{stats.totalRequests}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 