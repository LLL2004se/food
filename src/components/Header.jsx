import React, { useState } from 'react';

export default function Header({ page, setPage, auth, onLogout }) {
  const [openMenu, setOpenMenu] = useState(false);
  const donationsLabel = auth?.user?.user_type === "volunteer"
    ? "Pickups"
    : auth?.user?.user_type === "ngo"
      ? "Requests"
      : "Donations";

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
            <button className={`nav-button ${page==="home"?"active":""}`} onClick={()=>setPage("home")}>Home</button>
            <button className={`nav-button ${page==="about"?"active":""}`} onClick={()=>setPage("about")}>About Us</button>
            <button className={`nav-button ${page==="contact"?"active":""}`} onClick={()=>setPage("contact")}>Contact Us</button>
            <button className={`nav-button ${page==="dashboard"?"active":""}`} onClick={()=>setPage("dashboard")}>{donationsLabel}</button>
            {auth.isLoggedIn && auth.user?.user_type === "volunteer" && (
              <>
                <button className={`nav-button ${page==="volunteer-dashboard"?"active":""}`} onClick={()=>setPage("volunteer-dashboard")}> Dashboard</button>
                <button className={`nav-button ${page==="volunteer-delivery"?"active":""}`} onClick={()=>setPage("volunteer-delivery")}>Deliveries</button>
              </>
            )}
            <button className={`nav-button ${page==="login"?"active":""}`} onClick={()=>setPage("login")}>Login</button>
          </nav>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {auth.isLoggedIn && (
              <button
                type="button"
                onClick={() => setPage('notification')}
                className="header-notification-toggle"
                aria-label="Open notifications"
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
                  {auth.user?.user_type === "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage('admin-dashboard');
                        setOpenMenu(false);
                      }}
                    >
                      Admin Panel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPage('profile');
                      setOpenMenu(false);
                    }}
                  >
                    Profile
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      onLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span style={{color:"#6b7280"}}>Not signed in</span>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}