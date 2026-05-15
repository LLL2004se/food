import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'https://food-backend-d44t.onrender.com/api';

const NotificationCenterPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = localStorage.getItem('token');
      setNotifications(prev => prev.map((item) => ({ ...item, read: true })));
      await axios.patch(`${API_BASE}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      fetchNotifications();
    }
  };

  return (
    <div className="notification-center-page">
      <div className="notification-center-shell">
        <section className="notification-panel notification-feed-panel">
          <div className="notification-panel-header">
            <div>
              <h3>Recent Notifications</h3>
              <p>Donation activity and status updates appear here.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="notification-panel-chip">{unreadCount} unread</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="notification-secondary-btn"
                  style={{ padding: '7px 14px', fontSize: '14px' }}
                >
                  Read All
                </button>
              )}
            </div>
          </div>

          {loadingNotifications ? (
            <div className="notification-empty-state">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty-state">No notifications yet.</div>
          ) : (
            <div className="notification-feed-list">
              {notifications.map((notification) => (
                <article
                  key={notification._id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-item-main">
                    <div className="notification-item-dot" aria-hidden="true" />
                    <div>
                      <p className="notification-item-message">{notification.message}</p>
                      <p className="notification-item-meta">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="notification-item-actions">
                    <span className={`notification-status-pill ${notification.read ? 'read' : 'unread'}`}>
                      {notification.read ? 'Read' : 'Unread'}
                    </span>
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification._id)}
                        className="notification-secondary-btn"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NotificationCenterPage;
