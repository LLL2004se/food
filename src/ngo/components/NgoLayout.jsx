import React from 'react';
import NgoHeader from './NgoHeader';
import Footer from '../../components/Footer';

export default function NgoLayout({ children, page, setPage, auth, onLogout }) {
  return (
    <div className="ngo-layout">
      <NgoHeader page={page} setPage={setPage} auth={auth} onLogout={onLogout} />
      <div className="ngo-main-content">
        {children}
      </div>
      <Footer />
    </div>
  );
}
