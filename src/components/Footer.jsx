import React from 'react';

const SOCIAL_LINKS = [
  { label: 'Facebook', symbol: 'f' },
  {
    label: 'Instagram',
    symbol: '◎',
    href: 'https://www.instagram.com/abhay_rai_0407?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
  },
  { label: 'Twitter', symbol: '𝕏' },
  { label: 'LinkedIn', symbol: 'in' },
];

const BUILT_FOR = [
  'Donors',
  'NGOs',
  'Volunteers',
  'Restaurants',
];

function FooterIcon({ type }) {
  if (type === 'mail') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'phone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 4.5c.5 0 1 .2 1.3.6l1.8 2.3c.4.5.4 1.2 0 1.7l-1.2 1.5c.8 1.5 2 2.8 3.5 3.5l1.5-1.2c.5-.4 1.2-.4 1.7 0l2.3 1.8c.4.3.6.8.6 1.3 0 1.9-1.6 3.5-3.5 3.5-5.8 0-10.5-4.7-10.5-10.5 0-1.9 1.6-3.5 3.5-3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-4.4 6-10a6 6 0 1 0-12 0c0 5.6 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-column footer-brand-column">
          <div className="footer-brand-row">
            <div className="footer-brand-mark" aria-hidden="true">
              <span className="footer-heart">♡</span>
            </div>
            <div className="footer-brand">Food-Print</div>
          </div>
          <p className="footer-description">
            Reducing food waste by connecting donors, NGOs, volunteers, and restaurants in one
            simple flow.
          </p>
          <div className="footer-highlight-card">
            <div className="footer-highlight-icon" aria-hidden="true">
              <span>🛡</span>
            </div>
            <p>Together, we can build a zero hunger future.</p>
          </div>
        </div>

        <div className="footer-column">
          <h4>Support</h4>
          <a className="footer-contact-link" href="mailto:yash.shinde17570@sakec.ac.in">
            <span className="footer-contact-icon"><FooterIcon type="mail" /></span>
            yash.shinde17570@sakec.ac.in
          </a>
          <a className="footer-contact-link" href="tel:+919769087568">
            <span className="footer-contact-icon"><FooterIcon type="phone" /></span>
            +91 97690 87568
          </a>
          <div className="footer-contact-link footer-contact-static">
            <span className="footer-contact-icon"><FooterIcon type="location" /></span>
            <span>SAKEC, Chembur, Mumbai, Maharashtra 400074</span>
          </div>
        </div>

        <div className="footer-column">
          <h4>Built For</h4>
          <div className="footer-built-list">
            {BUILT_FOR.map((item) => (
              <div className="footer-built-item" key={item}>
                <span className="footer-contact-icon footer-built-icon" aria-hidden="true">
                  <span>◦</span>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-column">
          <h4>Follow Us</h4>
          <p className="footer-description footer-follow-text">
            Stay connected and be a part of our impact.
          </p>
          <div className="footer-social-row" aria-label="Social links">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                className="footer-social-link"
                href={item.href || '#'}
                aria-label={item.label}
                title={item.label}
                target={item.href ? '_blank' : undefined}
                rel={item.href ? 'noopener noreferrer' : undefined}
              >
                {item.symbol}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-full">© 2026 Food-Print. All rights reserved.</div>
      </div>
    </footer>
  );
}
