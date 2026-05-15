import React, { useState, useEffect } from 'react';

export default function NgoVolunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignModal, setAssignModal] = useState(null); // volunteer object
  const [unassignedPickups, setUnassignedPickups] = useState([]);
  const [loadingPickups, setLoadingPickups] = useState(false);

  // Invite form state
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", volunteer_skills: "", volunteer_availability: ""
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  async function fetchVolunteers() {
    setLoading(true);
    try {
      const res = await fetch("https://food-backend-d44t.onrender.com/api/ngo/volunteers", { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVolunteers(data);
        setError("");
      } else {
        setVolunteers([]);
      }
    } catch (err) {
      console.error("Error fetching volunteers:", err);
      setError("Failed to load volunteers");
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  }

  // --- Invite volunteer ---
  async function handleInvite(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Name and email are required");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("https://food-backend-d44t.onrender.com/api/ngo/volunteers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Volunteer invited successfully! Default password: volunteer123");
        setShowForm(false);
        setFormData({ name: "", email: "", phone: "", volunteer_skills: "", volunteer_availability: "" });
        fetchVolunteers();
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setFormError(data.message || "Failed to invite volunteer");
      }
    } catch (err) {
      setFormError("Network error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  }

  // --- Toggle status ---
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "pending" : "active";
    try {
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/ngo/volunteers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ approval_status: newStatus }),
      });
      if (res.ok) {
        setVolunteers(prev =>
          prev.map(v => v._id === id ? { ...v, approval_status: newStatus } : v)
        );
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  }

  // --- Assign pickup modal ---
  async function openAssignModal(volunteer) {
    setAssignModal(volunteer);
    setLoadingPickups(true);
    try {
      const res = await fetch("https://food-backend-d44t.onrender.com/api/ngo/unassigned-pickups", { headers });
      const data = await res.json();
      setUnassignedPickups(Array.isArray(data) ? data : []);
    } catch (err) {
      setUnassignedPickups([]);
    } finally {
      setLoadingPickups(false);
    }
  }

  async function handleAssignPickup(volunteerId, pickupId) {
    try {
      const res = await fetch(`https://food-backend-d44t.onrender.com/api/ngo/volunteers/${volunteerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ pickup_id: pickupId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Volunteer assigned to pickup!");
        setAssignModal(null);
        fetchVolunteers();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        alert(data.message || "Failed to assign");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  // --- Filter & search ---
  const filtered = volunteers.filter(v => {
    const matchesSearch =
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase()) ||
      (v.phone || "").includes(search);
    const matchesStatus =
      statusFilter === "all" ||
      v.approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalActive = volunteers.filter(v => v.approval_status === "active").length;
  const totalInactive = volunteers.filter(v => v.approval_status !== "active").length;
  const totalAssigned = volunteers.reduce((s, v) => s + (v.activePickups || 0), 0);

  if (loading) return <div className="ngo-page"><p>Loading volunteers...</p></div>;

  return (
    <div className="ngo-page ngo-volunteers">
      <h1>Volunteers Management</h1>
      <p className="page-subtitle">Manage your volunteer workforce — invite, search, assign pickups, and track activity.</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="vol-success-msg">{success}</div>}

      {/* Summary Stats */}
      <div className="vol-summary-bar">
        <div className="vol-stat"><span className="vol-stat-num">{volunteers.length}</span><span className="vol-stat-label">Total</span></div>
        <div className="vol-stat active"><span className="vol-stat-num">{totalActive}</span><span className="vol-stat-label">Active</span></div>
        <div className="vol-stat inactive"><span className="vol-stat-num">{totalInactive}</span><span className="vol-stat-label">Inactive</span></div>
        <div className="vol-stat assigned"><span className="vol-stat-num">{totalAssigned}</span><span className="vol-stat-label">On Duty</span></div>
      </div>

      {/* Toolbar */}
      <div className="vol-toolbar">
        <input
          className="vol-search"
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="vol-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Inactive</option>
        </select>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
          {showForm ? "\u2715 Close" : "\u002B Invite Volunteer"}
        </button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <form className="vol-invite-form" onSubmit={handleInvite}>
          <h3>Invite New Volunteer</h3>
          {formError && <div className="error-message">{formError}</div>}
          <div className="vol-form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Availability</label>
              <input type="text" placeholder="e.g. Weekdays 9-5" value={formData.volunteer_availability} onChange={e => setFormData(p => ({ ...p, volunteer_availability: e.target.value }))} />
            </div>
            <div className="form-group vol-form-full">
              <label>Skills</label>
              <input type="text" placeholder="e.g. Driving, Cooking" value={formData.volunteer_skills} onChange={e => setFormData(p => ({ ...p, volunteer_skills: e.target.value }))} />
            </div>
          </div>
          <p className="form-info">Default password will be <strong>volunteer123</strong>. The volunteer can change it after logging in.</p>
          <div className="vol-form-actions">
            <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? "Inviting..." : "Send Invite"}</button>
            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Volunteer Cards */}
      {filtered.length === 0 ? (
        <p className="no-data">{search || statusFilter !== "all" ? "No volunteers match your filters" : "No volunteers registered yet"}</p>
      ) : (
        <div className="volunteers-list">
          {filtered.map((volunteer) => (
            <div key={volunteer._id} className={`volunteer-card ${volunteer.approval_status !== "active" ? "vol-inactive" : ""}`}>
              <div className="volunteer-header">
                <div className="vol-name-row">
                  <h3>{volunteer.name}</h3>
                  <div className="vol-badges">
                    {volunteer.activePickups > 0 && (
                      <span className="vol-duty-badge">On Duty</span>
                    )}
                  </div>
                </div>
                <span
                  className={`vol-status-toggle ${volunteer.approval_status === "active" ? "active" : "inactive"}`}
                  onClick={() => toggleStatus(volunteer._id, volunteer.approval_status)}
                  title={volunteer.approval_status === "active" ? "Click to deactivate" : "Click to activate"}
                >
                  <span className="vol-toggle-dot" />
                  {volunteer.approval_status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="volunteer-details">
                <p><strong>Email:</strong> {volunteer.email}</p>
                <p><strong>Phone:</strong> {volunteer.phone || "N/A"}</p>
                {volunteer.volunteer_skills && <p><strong>Skills:</strong> {volunteer.volunteer_skills}</p>}
                {volunteer.volunteer_availability && <p><strong>Availability:</strong> {volunteer.volunteer_availability}</p>}
              </div>

              {/* Pickup stats */}
              <div className="vol-pickup-stats">
                <span title="Total pickups">{"\uD83D\uDCE6"} {volunteer.totalPickups || 0} total</span>
                <span title="Active pickups">{"\uD83D\uDD52"} {volunteer.activePickups || 0} active</span>
                <span title="Completed">{"\u2705"} {volunteer.completedPickups || 0} done</span>
              </div>

              <div className="volunteer-actions">
                <button
                  className="btn-primary"
                  onClick={() => openAssignModal(volunteer)}
                  disabled={volunteer.approval_status !== "active"}
                >
                  Assign Pickup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Pickup Modal */}
      {assignModal && (
        <div className="vol-modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="vol-modal" onClick={e => e.stopPropagation()}>
            <div className="vol-modal-header">
              <h3>Assign Pickup to {assignModal.name}</h3>
              <button className="btn-close" onClick={() => setAssignModal(null)}>&times;</button>
            </div>
            <div className="vol-modal-body">
              {loadingPickups ? (
                <p>Loading available pickups...</p>
              ) : unassignedPickups.length === 0 ? (
                <p className="no-data">No unassigned pickups available right now.</p>
              ) : (
                <div className="vol-pickup-list">
                  {unassignedPickups.map(p => (
                    <div key={p._id} className="vol-pickup-item">
                      <div className="vol-pickup-info">
                        <strong>{p.donation_id?.food_name || "Food Donation"}</strong>
                        <span className="vol-pickup-qty">{p.donation_id?.quantity || "?"} servings</span>
                        <span className="vol-pickup-addr">{p.donation_id?.address || "N/A"}</span>
                      </div>
                      <button className="btn-accept" onClick={() => handleAssignPickup(assignModal._id, p._id)}>Assign</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
