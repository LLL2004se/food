import React, { useEffect, useState } from 'react';
import '../css/home.css';

export default function Home({ onDirectDonate, onOpenRestaurant, onDonateMoney, auth = {}, onRequireLogin, moneyDonationsRefresh }) {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pastDonations, setPastDonations] = useState([]);
  const [loadingPastDonations, setLoadingPastDonations] = useState(false);
  const [recentMoneyDonations, setRecentMoneyDonations] = useState([]);
  const [loadingMoneyDonations, setLoadingMoneyDonations] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const res = await fetch("http://localhost:5000/api/events");
        if (!res.ok) throw new Error("Failed to load events");
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Events endpoint did not return JSON");
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setEvents(data);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("Error loading events:", err);
      }
    }

    async function loadPastDonations() {
      setLoadingPastDonations(true);
      try {
        const res = await fetch("http://localhost:5000/api/donations/recent-public");
        if (!res.ok) throw new Error("Failed to load past donations");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setPastDonations(data);
        }
      } catch (err) {
        console.error("Error loading past donations:", err);
      } finally {
        setLoadingPastDonations(false);
      }
    }

    loadEvents();
    loadPastDonations();
    loadRecentMoneyDonations();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadRecentMoneyDonations() {
    setLoadingMoneyDonations(true);
    try {
      const res = await fetch("http://localhost:5000/api/money-donations/recent-public");
      if (!res.ok) throw new Error("Failed to load money donations");
      const data = await res.json();
      if (Array.isArray(data)) setRecentMoneyDonations(data);
    } catch (err) {
      console.error("Error loading money donations:", err);
    } finally {
      setLoadingMoneyDonations(false);
    }
  }

  useEffect(() => {
    if (typeof moneyDonationsRefresh !== 'undefined') {
      loadRecentMoneyDonations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneyDonationsRefresh]);

  useEffect(() => {
    if (!events.length) return;

    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 6000);

    return () => clearInterval(id);
  }, [events]);

  const requireLoginOr = (action) => {
    if (!auth?.isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }
    action && action();
  };

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🌟 Make a Difference Today</div>
          <h1>Help a Cause — <span>Donate Now</span></h1>
          <p>Your donation helps NGOs provide food, education, and essential services to those in need. Together, we can make a real impact.</p>
          <div className="hero-buttons-group">
            <button
              className="btn btn-blue"
              onClick={() => requireLoginOr(onDonateMoney)}
            >
              💰 Donate Money
            </button>
            <button
              className="btn btn-green"
              onClick={() => requireLoginOr(onOpenRestaurant)}
            >
              🍽️ Donate Food
            </button>
          </div>
        </div>
        <div className="hero-image-wrap">
          <img
            src="/Home-image.png"
            alt="donation"
            className="hero-image-img"
          />
        </div>
      </section>

      <section className="home-carousel section-box">
        <div className="carousel-header">
          <div>
            <h2 className="section-title">📢 Recent Events & Campaigns</h2>
            <p className="carousel-subtitle">Stay updated with ongoing donation drives and community initiatives</p>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="home-carousel-empty">
            <p>No recent events at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="carousel-wrapper">
            <div
              className="home-carousel-card"
              onClick={() => requireLoginOr(onDirectDonate)}
              role="button"
              tabIndex="0"
            >
              <div className="home-carousel-image">
                {events[currentIndex]?.imageUrl && (
                  <img
                    src={events[currentIndex]?.imageUrl}
                    alt={events[currentIndex]?.title || "Recent donation event"}
                  />
                )}
                <div className="carousel-badge">Featured</div>
              </div>
              <div className="home-carousel-body">
                <h3>{events[currentIndex]?.title || "Donation drive"}</h3>
                {events[currentIndex]?.description && (
                  <p>{events[currentIndex].description}</p>
                )}
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={(e) => {
                    e.stopPropagation();
                    requireLoginOr(onDirectDonate);
                  }}
                >
                  Participate in This Campaign →
                </button>
              </div>
            </div>

            {events.length > 1 && (
              <div className="home-carousel-dots">
                {events.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={idx === currentIndex ? "dot active" : "dot"}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Event ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="home-donations-section">
  <h2>Some of Our Past Donations</h2>
  <p className="subtitle">A few recent donations shared by our community</p>

  {loadingPastDonations ? (
    <div className="loading-message">Loading donations...</div>
  ) : pastDonations.length === 0 ? (
    <div className="no-donations-message">No past donations available.</div>
  ) : (
    <div className="donations-grid">
      {pastDonations.map((donation) => (
          <div key={donation._id} className="donation-card">

            {/* HEADER */}
            <div className="donation-header">
              <h3>{donation.food_name}</h3>
              <span className="quantity-badge">
                {donation.quantity} servings/kg
              </span>
            </div>

            {/* BODY */}
            <div className="donation-body">
              {donation.food_type && (
                <p><strong>Type:</strong> {donation.food_type}</p>
              )}

              <p><strong>Location:</strong> {donation.address}</p>

              <p><strong>Status:</strong> {donation.status || "pending"}</p>

              {donation.expiry_time && (
                <p>
                  <strong>When:</strong>{" "}
                  {new Date(donation.expiry_time).toLocaleString()}
                </p>
              )}

              <p className="donor-info">
                <strong>From:</strong>{" "}
                {donation.donor_id?.name || "Anonymous"}
              </p>
            </div>

          </div>
        ))}
    </div>
  )}
</section>

      <section className="home-money-donations section-box">
        <h2>Recent Money Donations</h2>
        <p className="subtitle">Support from donors powering our work</p>

        {loadingMoneyDonations ? (
          <div className="loading-message">Loading donations...</div>
        ) : recentMoneyDonations.length === 0 ? (
          <div className="no-donations-message">No money donations yet.</div>
        ) : (
          <div className="donations-grid">
            {recentMoneyDonations.map((d) => (
              <div key={d._id} className="donation-card">
                <div className="donation-header">
                  <h3>₹{d.amount?.toFixed(0)}</h3>
                </div>
                <div className="donation-body">
                  <p><strong>From:</strong> {d.donor_id?.name || 'Anonymous'}</p>
                  <p><strong>Purpose:</strong> {d.purpose || 'General donation'}</p>
                  <p><strong>Date:</strong> {new Date(d.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-2">
        <div className="grid-card">
          <h3>Restaurant Food Donation</h3>
          <p>Restaurants can donate surplus food. We collect and distribute to nearby NGOs and shelters.</p>
          <button
            className="btn btn-green"
            onClick={() => requireLoginOr(onOpenRestaurant)}
          >
            🍽️ Donate Food
          </button>
        </div>
        <div className="grid-card">
          <h3>Donate Money</h3>
          <p>Contribute financially to empower NGOs in delivering food, care, and essential support to communities.</p>
          <button
            className="btn btn-blue"
            onClick={() => requireLoginOr(onDonateMoney)}
          >
            💰 Donate Money
          </button>
        </div>
      </div>
    </>
  );
}