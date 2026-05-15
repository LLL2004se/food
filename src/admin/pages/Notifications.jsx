import React, { useState, useEffect, useMemo } from 'react';

const API = 'http://localhost:5000/api/admin';
const PAGE_SIZE = 7;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchNotifications(); }, []);

  function fetchNotifications() {
    const token = localStorage.getItem('token');
    fetch(`${API}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch(err => console.log("Error fetching notifications:", err));
  }

  const filteredNotifications = useMemo(() => (
    filter === 'all'
      ? notifications
      : notifications.filter(n => filter === 'unread' ? !n.read : n.read)
  ), [filter, notifications]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedNotifications = filteredNotifications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstItem = filteredNotifications.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(safePage * PAGE_SIZE, filteredNotifications.length);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    const token = localStorage.getItem('token');
    setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } })
      .catch(err => console.log("Error marking notification as read:", err));
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = localStorage.getItem('token');
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
      const res = await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
    } catch (err) {
      console.log("Error marking all notifications as read:", err);
      fetchNotifications();
    }
  };

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/notifications/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchNotifications();
      setPage(1);
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="admin-page admin-notifications-page">
      <div className="admin-page-header admin-header-shell mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold">Notifications</h1>
          <p className="admin-text-muted mt-2">Manage system notifications</p>
        </div>
        <div className="admin-page-header-actions flex gap-2">
          {['all','unread','read'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`admin-filter-btn ${filter === s ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}`}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className={`admin-filter-btn ${unreadCount === 0 ? 'admin-filter-btn-inactive opacity-50 cursor-not-allowed' : 'admin-filter-btn-active'}`}
          >
            Read All
          </button>
        </div>
      </div>

      <div className="admin-card-bg admin-table-shell admin-border shadow-md border overflow-hidden">
        <div className="admin-table-wrap">
        <table className="admin-text admin-table min-w-full">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNotifications.map(n => (
              <tr key={n._id} className={`admin-tr-hover ${!n.read ? 'admin-bg' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap"><div className="admin-text text-sm font-medium">{n.user_id}</div></td>
                <td className="px-6 py-4"><div className="admin-text text-sm">{n.message}</div></td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${n.read ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {n.read ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td className="admin-text-muted px-6 py-4 whitespace-nowrap text-sm">
                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="adm-actions">
                    {!n.read && (
                      <button className="adm-btn-edit" onClick={() => markAsRead(n._id)}>Mark Read</button>
                    )}
                    <button className="adm-btn-delete" onClick={() => setDeleteId(n._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="admin-users-footer">
          <div className="admin-users-summary">
            Showing {firstItem || 0} to {lastItem || 0} of {filteredNotifications.length} notifications
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

      {/* Delete Confirm */}
      {deleteId && (
        <div className="adm-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this notification? This action cannot be undone.</p>
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
