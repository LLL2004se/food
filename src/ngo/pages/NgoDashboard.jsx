import React, { useState, useEffect } from 'react';

export default function NgoDashboard({ setPage }) {
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/ngo/dashboard-stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        setRecentDonations(data.recentDonations || []);
        setError("");
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'assigned': return '#3498db';
      case 'completed': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  if (loading) return <div className="ngo-page"><p>Loading dashboard...</p></div>;

  return (
    <div className="ngo-dashboard-page">
      <div className="dashboard-header-section">
        <h1>Dashboard Overview</h1>
        <p className="subtitle">Welcome back! Here's what's happening with your donations.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="dashboard-stats-grid">
            <div className="dash-stat-card pending-card" onClick={() => setPage('ngo-donations')}>
              <div className="dash-stat-icon">📋</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.pending}</span>
                <span className="dash-stat-label">Pending Requests</span>
              </div>
            </div>

            <div className="dash-stat-card assigned-card">
              <div className="dash-stat-icon">✅</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.assigned}</span>
                <span className="dash-stat-label">Accepted</span>
              </div>
            </div>

            <div className="dash-stat-card completed-card">
              <div className="dash-stat-icon">🎉</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.completed}</span>
                <span className="dash-stat-label">Completed</span>
              </div>
            </div>

            <div className="dash-stat-card meals-card">
              <div className="dash-stat-icon">🍽️</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.totalMeals}</span>
                <span className="dash-stat-label">Total Meals</span>
              </div>
            </div>

            <div className="dash-stat-card pickup-card" onClick={() => setPage('ngo-pickups')}>
              <div className="dash-stat-icon">🚚</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.activePickups}</span>
                <span className="dash-stat-label">Active Pickups</span>
              </div>
            </div>

            <div className="dash-stat-card expiry-card" onClick={() => setPage('ngo-donations')}>
              <div className="dash-stat-icon">⏰</div>
              <div className="dash-stat-info">
                <span className="dash-stat-number">{stats.expiringSoon}</span>
                <span className="dash-stat-label">Expiring Soon</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Recent Activity + Quick Actions */}
          <div className="dashboard-bottom">
            {/* Recent Donations */}
            <div className="dashboard-section recent-section">
              <h2>Recent Donations</h2>
              {recentDonations.length === 0 ? (
                <p className="empty-text">No recent donations</p>
              ) : (
                <div className="recent-list">
                  {recentDonations.map((donation) => (
                    <div key={donation._id} className="recent-item">
                      <div className="recent-item-icon">
                        {donation.food_name?.toLowerCase().includes('rice') ? '\u{1F35A}' :
                          donation.food_name?.toLowerCase().includes('bread') ? '\u{1F35E}' :
                            donation.food_name?.toLowerCase().includes('fruit') ? '\u{1F34E}' :
                              '\u{1F37D}\u{FE0F}'}
                      </div>
                      <div className="recent-item-info">
                        <span className="recent-item-name">{donation.food_name}</span>
                        <span className="recent-item-meta">
                          {donation.quantity} meals &middot; {donation.donor_id?.name || 'Anonymous'} &middot; {getTimeAgo(donation.createdAt)}
                        </span>
                      </div>
                      <span
                        className="recent-item-status"
                        style={{ background: getStatusColor(donation.status) }}
                      >
                        {donation.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section actions-section">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => setPage('ngo-donations')}>
                  <span className="qa-icon">📋</span>
                  <span>View Requests</span>
                </button>
                <button className="quick-action-btn" onClick={() => setPage('ngo-pickups')}>
                  <span className="qa-icon">🚚</span>
                  <span>Manage Pickups</span>
                </button>
                <button className="quick-action-btn" onClick={() => setPage('ngo-volunteers')}>
                  <span className="qa-icon">👥</span>
                  <span>Volunteers</span>
                </button>
                <button className="quick-action-btn" onClick={() => setPage('ngo-reports')}>
                  <span className="qa-icon">�</span>
                  <span>Donation History</span>
                </button>
                <button className="quick-action-btn" onClick={() => setPage('ngo-profile')}>
                  <span className="qa-icon">⚙️</span>
                  <span>NGO Profile</span>
                </button>
              </div>

              {/* Summary */}
              <div className="dashboard-summary">
                <h3>At a Glance</h3>
                <div className="summary-row">
                  <span>Deliveries Completed</span>
                  <strong>{stats.completedPickups}</strong>
                </div>
                <div className="summary-row">
                  <span>Success Rate</span>
                  <strong>
                    {stats.completed + stats.assigned > 0
                      ? Math.round((stats.completed / (stats.completed + stats.assigned + stats.pending)) * 100)
                      : 0}%
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Total Requests</span>
                  <strong>{stats.pending + stats.assigned + stats.completed}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
