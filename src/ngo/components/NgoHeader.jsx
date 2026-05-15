import React, { useState } from 'react';

export default function NgoHeader({ page, setPage, auth, onLogout }) {
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <header>
      <div className="header-inner">
        <div className="header-brand">
          <img 
            src="/ChatGPT Image Feb 16, 2026, 07_54_00 PM.png" 
            alt="Food-Print Logo" 
            className="header-logo-image"
          />
          <nav className="nav-buttons">
            <button 
              className={`nav-button ${page === "ngo-donations" ? "active" : ""}`} 
              onClick={() => setPage("ngo-donations")}
            >
              Donation Requests
            </button>
            <button 
              className={`nav-button ${page === "ngo-pickups" ? "active" : ""}`} 
              onClick={() => setPage("ngo-pickups")}
            >
              Pickups
            </button>
            <button 
              className={`nav-button ${page === "ngo-volunteers" ? "active" : ""}`} 
              onClick={() => setPage("ngo-volunteers")}
            >
              Volunteers
            </button>
            <button 
              className={`nav-button ${page === "ngo-reports" ? "active" : ""}`} 
              onClick={() => setPage("ngo-reports")}
            >
              Donation History
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {auth.isLoggedIn && (
              <button
                type="button"
                onClick={() => setPage('ngo-notification')}
                className="header-notification-toggle"
                aria-label="Open NGO notifications"
                title="Notifications"
              >
                <span className="header-notification-icon" aria-hidden="true">🔔</span>
              </button>
            )}
        </div>
        
        <div className='User-name'>
          {auth.isLoggedIn ? (
            <div className="user-menu">
              <button
                type="button"
                className="user-menu-button"
                onClick={() => setOpenMenu((v) => !v)}
              >
                <span className="user-menu-name">
                  {auth.user?.name ?? auth.user?.email}
                </span>
                <span className="user-menu-chevron">▾</span>
              </button>
              {openMenu && (
                <div className="user-menu-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      setPage('ngo-profile');
                      setOpenMenu(false);
                    }}
                    className="user-menu-item"
                  >
                    My Profile
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setOpenMenu(false);
                    }}
                    className="user-menu-item"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-button" onClick={() => setPage("login")}>Login</button>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
