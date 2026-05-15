import React, { useState } from 'react';

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatusMessage('');
    const form = e.currentTarget;

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      comment: formData.get('comment'),
    };

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      setStatusMessage('Thanks for reaching out. Your message has been emailed to our team.');
      form.reset();
    } catch (error) {
      setStatusMessage(error.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="contact-section">
      <div className="contact-shell">
        <div className="contact-intro">
          <div className="contact-kicker">Get in touch</div>
          <h1>We&apos;re here to help with donations, partnerships, and support.</h1>
          <p>
            Whether you&apos;re a donor, NGO, volunteer, or restaurant partner, reach out and
            we&apos;ll guide you to the right next step.
          </p>

          <div className="contact-highlights">
            <div className="contact-highlight-card">
              <span className="contact-highlight-icon">✉️</span>
              <div>
                <strong>Email</strong>
                <a href="mailto:yash.shinde17570@sakec.ac.in">yash.shinde17570@sakec.ac.in</a>
              </div>
            </div>
            <div className="contact-highlight-card">
              <span className="contact-highlight-icon">📞</span>
              <div>
                <strong>Phone</strong>
                <a href="tel:+919769087568">+91 97690 87568</a>
              </div>
            </div>
            <div className="contact-highlight-card">
              <span className="contact-highlight-icon">🕒</span>
              <div>
                <strong>Hours</strong>
                <span>Mon - Sat, 9:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>

          <div className="contact-note">
            Typical response time: within one business day.
          </div>
        </div>

        <form className="contact-form form-scroll" onSubmit={handleSubmit}>
          <div className="contact-form-heading">
            <h2>Send a message</h2>
            <p>Tell us what you need and we&apos;ll get back with a practical answer.</p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" placeholder="Your full name" required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" name="phone" type="tel" placeholder="+91 00000 00000" />
          </div>

          <div className="form-group">
            <label htmlFor="comment">How can we help?</label>
            <textarea
              id="comment"
              name="comment"
              rows={5}
              placeholder="Share your question, partnership idea, or support request..."
              required
            />
          </div>

          <div className="contact-form-footer">
            <p>We only use your details to respond to this message.</p>
            {statusMessage ? <p role="status">{statusMessage}</p> : null}
            <button
              type="submit"
              className="button-emerald contact-submit"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
