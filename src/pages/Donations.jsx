import React from 'react';

export default function Donations() {
  return (
    <section className="about-section">
      <div className="about-hero">
        <h1>About Food-Print</h1>
        <p>
          Food-Print is a simple way to make sure good food is not thrown away. We connect
          individuals, restaurants, and NGOs so surplus meals reach people who need them,
          instead of ending up in the bin.
        </p>
      </div>

      <div className="about-grid">
        <div className="about-card">
          <h3>Our mission</h3>
          <p>
            Our goal is to reduce food waste and hunger at the same time. We make it easy to share
            extra food in a safe, organised way, so donors and NGOs don&apos;t have to manage
            everything over phone calls and spreadsheets.
          </p>
        </div>
        <div className="about-card">
          <h3>How it works</h3>
          <p>
            Donors and restaurants can quickly list what food they have and when it&apos;s ready.
            NGOs and shelters can see these offers, request what matches their needs, and arrange
            pickups. Everything stays in one place so both sides can track what has been donated.
          </p>
        </div>
        <div className="about-card">
          <h3>Why it matters</h3>
          <p>
            Every day, a lot of food is cooked but not fully used, while many families still look
            for their next meal. By turning &quot;extra&quot; into &quot;shared&quot;, we support
            local communities, reduce waste, and make it easier for people to help each other in a
            practical way.
          </p>
        </div>
      </div>
    </section>
  );
}
