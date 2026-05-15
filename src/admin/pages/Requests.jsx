import React, { useState, useEffect, useMemo } from 'react';

const API = 'http://localhost:5000/api/admin';
const PAGE_SIZE = 7;

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchRequests(); }, []);

  function fetchRequests() {
    const token = localStorage.getItem('token');
    fetch(`${API}/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRequests(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch(err => console.log("Error fetching requests:", err));
  }

  const filteredRequests = useMemo(() => {
    return filter === 'all' ? requests : requests.filter(r => r.status === filter);
  }, [filter, requests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstItem = filteredRequests.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(safePage * PAGE_SIZE, filteredRequests.length);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/requests/${editItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          requested_quantity: editItem.requested_quantity,
          priority: editItem.priority,
          status: editItem.status,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditItem(null);
      fetchRequests();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/requests/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchRequests();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="admin-page admin-requests-page">
      <div className="admin-page-header admin-header-shell mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold">Requests</h1>
          <p className="admin-text-muted mt-2">Manage NGO food requests</p>
        </div>
        <div className="admin-page-header-actions flex gap-2">
          {['all','open','fulfilled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
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
              <th>Requested Quantity</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.map(r => (
              <tr key={r._id} className="admin-tr-hover">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="admin-text text-sm font-medium">{r.requested_quantity} servings</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(r.priority)}`}>{r.priority}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    r.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>{r.status}</span>
                </td>
                <td className="admin-text-muted px-6 py-4 whitespace-nowrap text-sm">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="adm-actions">
                    <button className="adm-btn-edit" onClick={() => setEditItem({ ...r })}>Edit</button>
                    <button className="adm-btn-delete" onClick={() => setDeleteId(r._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="admin-users-footer">
          <div className="admin-users-summary">
            Showing {firstItem || 0} to {lastItem || 0} of {filteredRequests.length} requests
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
            <h2>Edit Request</h2>
            <form onSubmit={handleUpdate}>
              <label>Quantity
                <input type="number" value={editItem.requested_quantity || ''} onChange={e => setEditItem({ ...editItem, requested_quantity: e.target.value })} />
              </label>
              <label>Priority
                <select value={editItem.priority} onChange={e => setEditItem({ ...editItem, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>Status
                <select value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="fulfilled">Fulfilled</option>
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
            <p>Are you sure you want to delete this request? This action cannot be undone.</p>
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
