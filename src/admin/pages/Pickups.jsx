import React, { useState, useEffect, useMemo } from 'react';

const API = 'https://food-backend-d44t.onrender.com/api/admin';
const PAGE_SIZE = 7;

export default function Pickups() {
  const [pickups, setPickups] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchPickups(); }, [filter]);

  async function fetchPickups() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API}/pickups${statusParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPickups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pickups:', err);
    } finally {
      setLoading(false);
    }
  }

  const paginatedPickups = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(pickups.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    return {
      totalPages,
      safePage,
      items: pickups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
      firstItem: pickups.length ? (safePage - 1) * PAGE_SIZE + 1 : 0,
      lastItem: Math.min(safePage * PAGE_SIZE, pickups.length),
    };
  }, [page, pickups]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'picked': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/pickups/${editItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: editItem.status }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditItem(null);
      fetchPickups();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/pickups/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchPickups();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="admin-page admin-pickups-page">
      <div className="admin-page-header admin-header-shell mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold">Pickups</h1>
          <p className="admin-text-muted mt-2">Track all pickup activities</p>
        </div>
        <div className="admin-page-header-actions flex gap-2">
          {['all','assigned','picked','delivered'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`admin-filter-btn ${filter === s ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}`}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-text text-center py-8">Loading...</div>
      ) : pickups.length === 0 ? (
        <div className="admin-text-muted text-center py-8">No {filter !== 'all' ? filter : ''} pickups found</div>
      ) : (
      <div className="admin-card-bg admin-table-shell admin-border shadow-md border overflow-hidden">
        <div className="admin-table-wrap">
        <table className="admin-text admin-table min-w-full">
          <thead>
            <tr>
              <th>Donation</th>
              <th>Volunteer</th>
              <th>Status</th>
              <th>Picked At</th>
              <th>Delivered At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPickups.items.map(p => (
              <tr key={p._id} className="admin-tr-hover">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="admin-text text-sm">
                    <div className="font-medium">{p.donation_id?.food_type || 'N/A'}</div>
                    <div className="admin-text-muted text-xs">{p.donation_id?.quantity || ''} servings</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="admin-text text-sm">
                    <div className="font-medium">{p.volunteer_id?.name || 'N/A'}</div>
                    <div className="admin-text-muted text-xs">{p.volunteer_id?.email || ''}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(p.status)}`}>{p.status}</span>
                </td>
                <td className="admin-text-muted px-6 py-4 whitespace-nowrap text-sm">
                  {p.picked_at ? new Date(p.picked_at).toLocaleDateString() : '-'}
                </td>
                <td className="admin-text-muted px-6 py-4 whitespace-nowrap text-sm">
                  {p.delivered_at ? new Date(p.delivered_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="adm-actions">
                    <button className="adm-btn-edit" onClick={() => setEditItem({ ...p })}>Edit</button>
                    <button className="adm-btn-delete" onClick={() => setDeleteId(p._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="admin-users-footer">
          <div className="admin-users-summary">
            Showing {paginatedPickups.firstItem || 0} to {paginatedPickups.lastItem || 0} of {pickups.length} pickups
          </div>
          <div className="admin-users-pagination">
            <button
              className="admin-users-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={paginatedPickups.safePage <= 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <button className="admin-users-page-btn admin-users-page-btn-active" disabled>
              {paginatedPickups.safePage}
            </button>
            <button
              className="admin-users-page-btn"
              onClick={() => setPage(p => Math.min(paginatedPickups.totalPages, p + 1))}
              disabled={paginatedPickups.safePage >= paginatedPickups.totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="adm-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h2>Update Pickup Status</h2>
            <form onSubmit={handleUpdate}>
              <label>Status
                <select value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="picked">Picked</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
              <div className="adm-modal-btns">
                <button type="button" className="adm-btn-cancel" onClick={() => setEditItem(null)}>Cancel</button>
                <button type="submit" className="adm-btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="adm-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this pickup? This action cannot be undone.</p>
            <div className="adm-modal-btns">
              <button className="adm-btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="adm-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
