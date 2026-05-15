import React, { useState, useEffect, useMemo } from 'react';

const API = 'https://food-backend-d44t.onrender.com/api/admin';
const PAGE_SIZE = 7;

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchDonations(); }, []);

  function fetchDonations() {
    const token = localStorage.getItem('token');
    fetch(`${API}/donations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setDonations(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch(err => console.log("Error fetching donations:", err));
  }

  const filteredDonations = useMemo(() => (
    filter === 'all' ? donations : donations.filter(d => d.status === filter)
  ), [filter, donations]);

  const totalPages = Math.max(1, Math.ceil(filteredDonations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedDonations = filteredDonations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstItem = filteredDonations.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(safePage * PAGE_SIZE, filteredDonations.length);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/donations/${editItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          food_name: editItem.food_name,
          quantity: editItem.quantity,
          status: editItem.status,
          address: editItem.address,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditItem(null);
      fetchDonations();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/donations/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchDonations();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="admin-page admin-donations-page">
      <div className="admin-page-header admin-header-shell mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold">Donations</h1>
          <p className="admin-text-muted mt-2">Manage all food donations</p>
        </div>
        <div className="admin-page-header-actions flex gap-2">
          {['all','pending','assigned','completed'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`admin-filter-btn ${filter === s ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}`}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card-bg admin-table-shell admin-border shadow-md border overflow-hidden">
        <div className="admin-table-wrap">
        <table className="admin-text admin-table min-w-full">
          <thead>
            <tr>
              <th>Food Name</th>
              <th>Quantity</th>
              <th>Address</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDonations.map(d => (
              <tr key={d._id} className="admin-tr-hover">
                <td className="px-6 py-4 whitespace-nowrap"><div className="admin-text text-sm font-medium">{d.food_name}</div></td>
                <td className="px-6 py-4 whitespace-nowrap"><div className="admin-text-muted text-sm">{d.quantity} servings</div></td>
                <td className="px-6 py-4"><div className="admin-text-muted text-sm">{d.address}</div></td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(d.status)}`}>{d.status}</span>
                </td>
                <td className="admin-text-muted px-6 py-4 whitespace-nowrap text-sm">
                  {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="adm-actions">
                    <button className="adm-btn-edit" onClick={() => setEditItem({ ...d })}>Edit</button>
                    <button className="adm-btn-delete" onClick={() => setDeleteId(d._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="admin-users-footer">
          <div className="admin-users-summary">
            Showing {firstItem || 0} to {lastItem || 0} of {filteredDonations.length} donations
          </div>
          <div className="admin-users-pagination">
            <button
              className="admin-users-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <button className="admin-users-page-btn admin-users-page-btn-active" disabled>
              {safePage}
            </button>
            <button
              className="admin-users-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="adm-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Donation</h2>
            <form onSubmit={handleUpdate}>
              <label>Food Name
                <input value={editItem.food_name || ''} onChange={e => setEditItem({ ...editItem, food_name: e.target.value })} />
              </label>
              <label>Quantity
                <input type="number" value={editItem.quantity || ''} onChange={e => setEditItem({ ...editItem, quantity: e.target.value })} />
              </label>
              <label>Address
                <input value={editItem.address || ''} onChange={e => setEditItem({ ...editItem, address: e.target.value })} />
              </label>
              <label>Status
                <select value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="completed">Completed</option>
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
            <p>Are you sure you want to delete this donation? This action cannot be undone.</p>
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
