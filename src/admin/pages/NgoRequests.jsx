import React, { useState, useEffect, useMemo } from 'react';

const API = 'https://food-backend-d44t.onrender.com/api/admin';
const PAGE_SIZE = 7;

export default function NgoRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchNgoRequests(); }, [filter]);

  async function fetchNgoRequests() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API}/ngo-requests${statusParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching NGO requests:', err);
    } finally {
      setLoading(false);
    }
  }

  const paginatedRequests = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    return {
      totalPages,
      safePage,
      items: requests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
      firstItem: requests.length ? (safePage - 1) * PAGE_SIZE + 1 : 0,
      lastItem: Math.min(safePage * PAGE_SIZE, requests.length),
    };
  }, [page, requests]);

  async function handleApproveNgo(requestId) {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ngo-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to approve');
      setRequests(requests.map(r => r._id === requestId ? { ...r, approval_status: 'active' } : r));
      setPage(1);
    } catch (err) {
      alert('Failed to approve NGO');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  }

  async function handleRejectNgo(requestId) {
    if (!window.confirm('Are you sure you want to reject this NGO request?')) return;
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ngo-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to reject');
      setRequests(requests.map(r => r._id === requestId ? { ...r, approval_status: 'rejected' } : r));
      setPage(1);
    } catch (err) {
      alert('Failed to reject NGO');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ngo-requests/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchNgoRequests();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active':
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-page admin-ngo-requests-page">
      <div className="admin-page-header admin-header-shell mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold">NGO Requests</h1>
          <p className="admin-text-muted mt-2">Manage NGO registration requests</p>
        </div>
        <div className="admin-page-header-actions flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(type => (
            <button key={type} onClick={() => { setFilter(type); setPage(1); }}
              className={`admin-filter-btn ${filter === type ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}`}>
              {type.charAt(0).toUpperCase()+type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-text text-center py-8">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="admin-text-muted text-center py-8">No {filter} NGO requests found</div>
      ) : (
        <div className="admin-card-bg admin-table-shell admin-border shadow-md border overflow-hidden">
          <div className="admin-table-wrap">
          <table className="admin-text admin-table min-w-full">
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Reg. Number</th>
                <th>Services</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.items.map(r => (
                <tr key={r._id} className="admin-tr-hover">
                  <td className="admin-text px-6 py-4 font-medium">{r.name}</td>
                  <td className="admin-text px-6 py-4">{r.email}</td>
                  <td className="admin-text px-6 py-4">{r.phone}</td>
                  <td className="admin-text px-6 py-4">{r.registration_number}</td>
                  <td className="admin-text px-6 py-4 text-sm">{r.description?.substring(0, 50)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(r.approval_status)}`}>
                      {r.approval_status?.charAt(0).toUpperCase() + r.approval_status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="adm-actions">
                      {r.approval_status === 'pending' && (
                        <>
                          <button className="adm-btn-approve" disabled={actionLoading[r._id]}
                            onClick={() => handleApproveNgo(r._id)}>
                            {actionLoading[r._id] ? '...' : 'Approve'}
                          </button>
                          <button className="adm-btn-reject" disabled={actionLoading[r._id]}
                            onClick={() => handleRejectNgo(r._id)}>
                            {actionLoading[r._id] ? '...' : 'Reject'}
                          </button>
                        </>
                      )}
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
              Showing {paginatedRequests.firstItem || 0} to {paginatedRequests.lastItem || 0} of {requests.length} NGO requests
            </div>
            <div className="admin-users-pagination">
              <button
                className="admin-users-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={paginatedRequests.safePage <= 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              <button className="admin-users-page-btn admin-users-page-btn-active" disabled>
                {paginatedRequests.safePage}
              </button>
              <button
                className="admin-users-page-btn"
                onClick={() => setPage(p => Math.min(paginatedRequests.totalPages, p + 1))}
                disabled={paginatedRequests.safePage >= paginatedRequests.totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="adm-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this NGO? This action cannot be undone.</p>
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
