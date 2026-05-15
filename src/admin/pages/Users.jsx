import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const API = 'https://food-backend-d44t.onrender.com/api/admin';
const PAGE_SIZE = 7;

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'donor', label: 'Donor' },
  // { key: 'ngo', label: 'Ngo' },
  { key: 'volunteer', label: 'Volunteer' },
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB');
}

function getTypeMeta(type) {
  switch ((type || '').toLowerCase()) {
    case 'ngo':
      return { label: 'Ngo', className: 'admin-user-pill admin-user-pill-ngo' };
    case 'volunteer':
      return { label: 'Volunteer', className: 'admin-user-pill admin-user-pill-volunteer' };
    case 'admin':
      return { label: 'Admin', className: 'admin-user-pill admin-user-pill-admin' };
    default:
      return { label: 'Donor', className: 'admin-user-pill admin-user-pill-donor' };
  }
}

function getAvatarLabel(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    const token = localStorage.getItem('token');
    fetch(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(err => console.log('Error fetching users:', err));
  }

  const filteredUsers = useMemo(() => {
    return filter === 'all' ? users : users.filter(user => (user.user_type || '').toLowerCase() === filter);
  }, [filter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstItem = filteredUsers.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(safePage * PAGE_SIZE, filteredUsers.length);

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/users/${editUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editUser.name,
          email: editUser.email,
          phone: editUser.phone,
          user_type: editUser.user_type,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditUser(null);
      fetchUsers();
      setPage(1);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/users/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      fetchUsers();
      setPage(1);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-page admin-users-page">
      <div className="admin-page-header admin-users-header mb-6 flex items-center justify-between">
        <div className="admin-page-header-left">
          <h1 className="admin-text text-3xl font-bold admin-users-title">Users</h1>
          <p className="admin-text-muted mt-2 admin-users-subtitle">Manage all platform users</p>
        </div>
        <div className="admin-page-header-actions admin-users-filters flex gap-2">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`admin-users-filter-btn ${filter === key ? 'admin-users-filter-btn-active' : 'admin-users-filter-btn-inactive'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card-bg admin-users-card admin-border rounded-lg shadow-md border overflow-hidden">
        <div className="admin-users-table-wrap">
          <table className="admin-users-table admin-text min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length ? paginatedUsers.map(user => {
                const typeMeta = getTypeMeta(user.user_type);
                return (
                  <tr key={user._id} className="admin-users-row">
                    <td>
                      <div className="admin-users-name-cell">
                        <div className="admin-users-avatar">{getAvatarLabel(user.name)}</div>
                        <div>
                          <div className="admin-users-name">{user.name || 'Unnamed User'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-users-email">{user.email || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={typeMeta.className}>{typeMeta.label}</span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="adm-actions admin-users-actions">
                        <button className="adm-btn-edit admin-users-action-btn" onClick={() => setEditUser({ ...user })}>
                          <PencilSquareIcon className="admin-users-action-icon" />
                          Edit
                        </button>
                        <button className="adm-btn-delete admin-users-action-btn" onClick={() => setDeleteId(user._id)}>
                          <TrashIcon className="admin-users-action-icon" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6">
                    <div className="admin-users-empty-state">
                      No users found for this filter.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-users-footer">
          <div className="admin-users-summary">
            Showing {firstItem || 0} to {lastItem || 0} of {filteredUsers.length} users
          </div>
          <div className="admin-users-pagination">
            <button
              className="admin-users-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="admin-users-pagination-icon" />
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
              <ChevronRightIcon className="admin-users-pagination-icon" />
            </button>
          </div>
        </div>
      </div>

      {editUser && (
        <div className="adm-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h2>Edit User</h2>
            <form onSubmit={handleUpdate}>
              <label>Name
                <input value={editUser.name || ''} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
              </label>
              <label>Email
                <input value={editUser.email || ''} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
              </label>
              <label>Phone
                <input value={editUser.phone || ''} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} />
              </label>
              <label>Type
                <select value={editUser.user_type} onChange={e => setEditUser({ ...editUser, user_type: e.target.value })}>
                  <option value="donor">Donor</option>
                  <option value="ngo">NGO</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="adm-modal-btns">
                <button type="button" className="adm-btn-cancel" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="adm-btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="adm-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
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
