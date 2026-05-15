import React, { useState, useEffect } from 'react';

export default function VolunteerDashboard({ auth, setPage }) {
  const [stats, setStats] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [activePickups, setActivePickups] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!auth?.isLoggedIn) return;
    fetchDashboard();
  }, [auth]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [statsRes, activeRes, histRes] = await Promise.all([
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/dashboard-stats', { headers }),
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/my-pickups', { headers }),
        fetch('https://food-backend-d44t.onrender.com/api/volunteer/delivery-history', { headers }),
      ]);
      const statsData = await statsRes.json();
      const active = await activeRes.json();
      const hist = await histRes.json();
      if (statsData && !statsData.error) setStats(statsData);
      if (Array.isArray(active)) setActivePickups(active);
      if (Array.isArray(hist)) setRecentDeliveries(hist.slice(0, 5));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function timeAgo(date) {
    if (!date) return "";
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (!auth?.isLoggedIn) {
    return <div className="vdash-page"><p>Please log in to view your dashboard.</p></div>;
  }

  if (loading) {
    return <div className="vdash-page"><div className="vd-loading"><div className="vd-spinner" /><p>Loading dashboard...</p></div></div>;
  }

  return (
    <div className="vdash-page">
      <div className="vdash-header">
        <div>
          <h1>{"\uD83D\uDC4B"} Welcome back, {auth.user?.name || "Volunteer"}!</h1>
          <p className="vdash-subtitle">Here's an overview of your delivery activity.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="vdash-stats">
        <div className="vdash-stat-card vdash-stat-active" onClick={() => setPage("volunteer-delivery")}>
          <div className="vdash-stat-icon">{"\uD83D\uDCE6"}</div>
          <div className="vdash-stat-body">
            <span className="vdash-stat-num">{stats?.active || 0}</span>
            <span className="vdash-stat-label">Active Deliveries</span>
          </div>
        </div>
        <div className="vdash-stat-card vdash-stat-done">
          <div className="vdash-stat-icon">{"\u2705"}</div>
          <div className="vdash-stat-body">
            <span className="vdash-stat-num">{stats?.completed || 0}</span>
            <span className="vdash-stat-label">Completed</span>
          </div>
        </div>
        <div className="vdash-stat-card vdash-stat-meals">
          <div className="vdash-stat-icon">{"\uD83C\uDF72"}</div>
          <div className="vdash-stat-body">
            <span className="vdash-stat-num">{stats?.totalMeals || 0}</span>
            <span className="vdash-stat-label">Meals Saved</span>
          </div>
        </div>
        <div className="vdash-stat-card vdash-stat-avg">
          <div className="vdash-stat-icon">{"\u23F1\uFE0F"}</div>
          <div className="vdash-stat-body">
            <span className="vdash-stat-num">{stats?.avgDeliveryTime ? `${stats.avgDeliveryTime}m` : "--"}</span>
            <span className="vdash-stat-label">Avg Delivery Time</span>
          </div>
        </div>
        <div className="vdash-stat-card vdash-stat-total">
          <div className="vdash-stat-icon">{"\uD83D\uDCCA"}</div>
          <div className="vdash-stat-body">
            <span className="vdash-stat-num">{stats?.total || 0}</span>
            <span className="vdash-stat-label">Total Pickups</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="vdash-bottom">
        {/* Active Pickups */}
        <div className="vdash-section">
          <div className="vdash-section-head">
            <h2>{"\uD83D\uDE9A"} Active Pickups</h2>
            {activePickups.length > 0 && (
              <button className="vdash-link-btn" onClick={() => setPage("volunteer-delivery")}>View All &rarr;</button>
            )}
          </div>
          {activePickups.length === 0 ? (
            <p className="vdash-empty">No active pickups. You're all caught up!</p>
          ) : (
            <div className="vdash-active-list">
              {activePickups.slice(0, 4).map((p) => (
                <div key={p._id} className="vdash-active-item" onClick={() => setPage("volunteer-delivery")}>
                  <div className="vdash-active-icon">
                    {p.status === "picked" ? "\uD83D\uDE9A" : p.status === "scheduled" ? "\uD83D\uDCC5" : "\uD83D\uDCE6"}
                  </div>
                  <div className="vdash-active-info">
                    <span className="vdash-active-name">{p.donation_id?.food_name || "Food Donation"}</span>
                    <span className="vdash-active-meta">{p.donation_id?.quantity || "?"} servings &middot; {p.donation_id?.address || ""}</span>
                  </div>
                  <span className={`vd-status-chip status-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Recent */}
        <div className="vdash-section">
          <h2>{"\u26A1"} Quick Actions</h2>
          <div className="vdash-actions">
            <button className="vdash-action-btn" onClick={() => setPage("volunteer-delivery")}>
              <span>{"\uD83D\uDCCD"}</span> Start Tracking
            </button>
            <button className="vdash-action-btn" onClick={() => setPage("volunteer-delivery")}>
              <span>{"\uD83D\uDCE6"}</span> View Deliveries
            </button>
            <button className="vdash-action-btn" onClick={() => setPage("profile")}>
              <span>{"\uD83D\uDC64"}</span> My Profile
            </button>
          </div>

          <h2 style={{ marginTop: '1.25rem' }}>{"\uD83D\uDCCB"} Recent Deliveries</h2>
          {recentDeliveries.length === 0 ? (
            <p className="vdash-empty">No deliveries completed yet.</p>
          ) : (
            <div className="vdash-recent-list">
              {recentDeliveries.map((d) => (
                <div key={d._id} className="vdash-recent-item">
                  <div className="vdash-recent-icon">{"\u2705"}</div>
                  <div className="vdash-recent-info">
                    <span className="vdash-recent-name">{d.donation_id?.food_name || "Delivery"}</span>
                    <span className="vdash-recent-meta">{d.donation_id?.quantity || "?"} servings &middot; {d.ngo_id?.name || "General"}</span>
                  </div>
                  <span className="vdash-recent-time">
                    {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : timeAgo(d.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
