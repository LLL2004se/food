import React, { useState, useEffect } from "react";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80",
    title: "Save The Children",
    text: "Join us in providing nutritious meals to those who need it most. Every donation counts toward building a hunger-free community.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1600&q=80",
    title: "Feed The Hungry",
    text: "Surplus food from restaurants and donors can reach shelters and families in under an hour. Be part of the change.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1600&q=80",
    title: "Reduce Food Waste",
    text: "Millions of meals are wasted every day. Together we can redirect surplus food to people who truly need it.",
  },
];

const stats = [
  { icon: "\ud83c\udf7d\ufe0f", value: "2K+", label: "Meals Saved" },
  { icon: "\ud83c\udfe2", value: "180+", label: "Partner NGOs" },
  { icon: "\ud83e\udd1d", value: "500+", label: "Active Volunteers" },
  { icon: "\ud83c\udf0d", value: "50+", label: "Areas Covered" },
];

const LandingPage = ({ onGetStarted }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index) => setCurrent(index);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);

  return (
    <main className="landing-page">
      {/* Hero Slider */}
      <section className="landing-slider">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`landing-slide ${i === current ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="landing-slide-overlay" />
            <div className="landing-slide-content">
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>
              <button className="landing-btn-green" onClick={onGetStarted}>
                Get Started
              </button>
            </div>
          </div>
        ))}

        <button className="landing-arrow landing-arrow-left" onClick={goPrev}>
          &#8249;
        </button>
        <button className="landing-arrow landing-arrow-right" onClick={goNext}>
          &#8250;
        </button>

        <div className="landing-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`landing-dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </section>

      {/* Welcome Section */}
      <section className="landing-welcome">
        <div className="landing-welcome-text">
          <h2>Welcome To FoodPrint</h2>
          <p className="landing-welcome-lead">
            We connect restaurants, donors, and NGOs with a simple flow: list surplus items,
            match to the nearest partner, and dispatch in minutes.
          </p>
          <p className="landing-welcome-body">
            Join the movement to reduce food waste and support local communities. Our platform
            uses AI-powered matching to ensure every donation reaches the right hands at the
            right time. Together, we can make sure no meal goes to waste.
          </p>
          <button className="landing-btn-green" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
        <div className="landing-welcome-media">
          <img
            src="/welcome-food.jpg"
            alt="Volunteers distributing food"
          />
          <div className="landing-play-btn">
            <span>{"\u25B6"}</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats">
        {stats.map((s, i) => (
          <div key={i} className="landing-stat-card">
            <span className="landing-stat-icon">{s.icon}</span>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="landing-features-section">
        <h2>How It Works</h2>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\ud83d\udce6"}</div>
            <h3>List Surplus Easily</h3>
            <p>Quickly note what food is left, how much there is, and when it's okay to pick it up.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\ud83e\udd16"}</div>
            <h3>Smart AI Matching</h3>
            <p>We connect you with nearby NGOs so food spends less time in transit and more time on plates.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\ud83d\udccd"}</div>
            <h3>Real-Time Tracking</h3>
            <p>Track your donation from pickup to delivery with live map updates and notifications.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section">
        <h2>Ready to Make a Difference?</h2>
        <p>Join thousands of donors and NGOs already using FoodPrint to fight hunger.</p>
        <button className="landing-btn-green landing-btn-lg" onClick={onGetStarted}>
          Get Started Now
        </button>
      </section>
    </main>
  );
};

export default LandingPage;
