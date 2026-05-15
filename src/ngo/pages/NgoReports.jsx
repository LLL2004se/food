import React, { useState, useEffect } from 'react';

export default function NgoReports() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/ngo/pickups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const combined = Array.isArray(data)
        ? data.map((pickup) => ({
            _id: pickup._id,
            food_name: pickup.donation_id?.food_name || 'Donation',
            quantity: pickup.donation_id?.quantity || 0,
            address: pickup.donation_id?.address || '—',
            status: pickup.status,
            createdAt: pickup.createdAt,
            expiry_time: pickup.donation_id?.expiry_time,
            donor_id: pickup.donation_id?.donor_id,
          }))
        : [];

      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDonations(combined);
      setError("");
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Failed to load donation history");
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fff3e0', color: '#e65100', label: 'Pending' },
      assigned: { bg: '#e3f2fd', color: '#1565c0', label: 'Assigned' },
      scheduled: { bg: '#ede7f6', color: '#5e35b1', label: 'Scheduled' },
      picked: { bg: '#e0f7fa', color: '#00838f', label: 'Picked Up' },
      delivered: { bg: '#e8f5e9', color: '#2e7d32', label: 'Delivered' },
      completed: { bg: '#e8f5e9', color: '#2e7d32', label: 'Completed' }
    };
    const s = styles[status] || { bg: '#f5f5f5', color: '#666', label: status };
    return (
      <span className="history-status-badge" style={{ background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const getFoodEmoji = (name) => {
    if (!name) return '\u{1F37D}\u{FE0F}';
    const n = name.toLowerCase();
    if (n.includes('rice')) return '\u{1F35A}';
    if (n.includes('bread') || n.includes('roti')) return '\u{1F35E}';
    if (n.includes('fruit')) return '\u{1F34E}';
    if (n.includes('veg') || n.includes('salad')) return '\u{1F957}';
    if (n.includes('milk') || n.includes('dairy')) return '\u{1F95B}';
    if (n.includes('chicken') || n.includes('meat')) return '\u{1F357}';
    if (n.includes('curry') || n.includes('dal')) return '\u{1F372}';
    return '\u{1F37D}\u{FE0F}';
  };

  // Filter and search
  const filtered = donations.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch = !searchTerm ||
      d.food_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.donor_id?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary stats
  const totalCount = donations.length;
  const pendingCount = donations.filter(d => d.status === 'pending').length;
  const assignedCount = donations.filter(d => d.status === 'assigned').length;
  const scheduledCount = donations.filter(d => d.status === 'scheduled').length;
  const pickedCount = donations.filter(d => d.status === 'picked').length;
  const deliveredCount = donations.filter(d => d.status === 'delivered').length;
  const completedCount = donations.filter(d => d.status === 'completed').length;
  const totalMeals = donations.reduce((sum, d) => sum + (d.quantity || 0), 0);

  if (loading) return <div className="ngo-page"><p>Loading donation history...</p></div>;

  return (
    <div className="ngo-history-page">
      <div className="history-header">
        <h1>Donation History</h1>
        <p className="subtitle">Complete log of all food donations — track status and past activity.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Bar */}
      <div className="history-summary-bar">
        <div className="hsb-item">
          <span className="hsb-num">{totalCount}</span>
          <span className="hsb-label">Total</span>
        </div>
        <div className="hsb-item pending">
          <span className="hsb-num">{pendingCount}</span>
          <span className="hsb-label">Pending</span>
        </div>
        <div className="hsb-item assigned">
          <span className="hsb-num">{assignedCount}</span>
          <span className="hsb-label">Assigned</span>
        </div>
        <div className="hsb-item">
          <span className="hsb-num">{scheduledCount}</span>
          <span className="hsb-label">Scheduled</span>
        </div>
        <div className="hsb-item">
          <span className="hsb-num">{pickedCount}</span>
          <span className="hsb-label">Picked Up</span>
        </div>
        <div className="hsb-item">
          <span className="hsb-num">{deliveredCount}</span>
          <span className="hsb-label">Delivered</span>
        </div>
        <div className="hsb-item completed">
          <span className="hsb-num">{completedCount}</span>
          <span className="hsb-label">Completed</span>
        </div>
        <div className="hsb-item meals">
          <span className="hsb-num">{totalMeals}</span>
          <span className="hsb-label">Total Meals</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="history-toolbar">
        <div className="history-search">
          <input
            type="text"
            placeholder="Search by food, donor, or address..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="history-search-input"
          />
        </div>
        <div className="history-filters">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="scheduled">Scheduled</option>
            <option value="picked">Picked Up</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
          </select>
          <button className="refresh-btn" onClick={fetchHistory}>Refresh</button>
        </div>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <p className="no-data">No donations found matching your criteria.</p>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Food</th>
                <th>Donor</th>
                <th>Qty</th>
                <th>Address</th>
                <th>Status</th>
                <th>Date</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((d) => (
                <tr key={d._id} className={`history-row ${d.status}`}>
                  <td className="food-cell">
                    <span className="food-emoji">{getFoodEmoji(d.food_name)}</span>
                    {d.food_name}
                  </td>
                  <td>{d.donor_id?.name || 'Anonymous'}</td>
                  <td className="qty-cell">{d.quantity}</td>
                  <td className="addr-cell" title={d.address}>{d.address}</td>
                  <td>{getStatusBadge(d.status)}</td>
                  <td className="date-cell">{formatDate(d.createdAt)}</td>
                  <td className="date-cell">
                    {d.expiry_time ? formatDate(d.expiry_time) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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
            {currentPage} <span className="page-divider">|</span> {totalPages}
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
    </div>
  );
}
