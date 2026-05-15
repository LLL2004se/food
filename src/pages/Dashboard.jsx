import React, { useEffect, useMemo, useState } from 'react';

function slugifyFoodName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getFoodCategory(foodName) {
  const normalized = slugifyFoodName(foodName);

  if (/milk|dairy|paneer|curd|yogurt|butter|cheese|buttermilk/.test(normalized)) return 'dairy';
  if (/rice|cooked|meal|biryani|curry|roti|chapati|lunch|dinner|snack|bread|pasta|noodles/.test(normalized)) return 'cooked';
  if (/pack|packet|biscuit|chips|noodle|pasta|cereal|bread|snack|box|jar/.test(normalized)) return 'packaged';
  if (/juice|drink|water|tea|coffee|soda|bottle|beverage|cold drink/.test(normalized)) return 'beverage';
  if (/fruit|vegetable|salad|banana|apple|orange|tomato|potato|onion|greens/.test(normalized)) return 'produce';
  if (/grain|wheat|flour|atta|dal|lentil|cereal|oats/.test(normalized)) return 'grains';

  return 'default';
}

function getFoodThumbnailSrc(category) {
  const paths = {
    dairy: '/food-thumbnails/dairy.svg',
    cooked: '/food-thumbnails/cooked.svg',
    packaged: '/food-thumbnails/packaged.svg',
    beverage: '/food-thumbnails/beverage.svg',
    produce: '/food-thumbnails/produce.svg',
    grains: '/food-thumbnails/grains.svg',
    default: '/food-thumbnails/default.svg',
  };

  return paths[category] || paths.default;
}

function getStatusTone(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('assign') || normalized.includes('complete') || normalized.includes('deliv')) {
    return 'success';
  }

  if (normalized.includes('pend') || normalized.includes('wait')) {
    return 'pending';
  }

  if (normalized.includes('cancel') || normalized.includes('reject') || normalized.includes('fail')) {
    return 'danger';
  }

  return 'neutral';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function DashboardSection({ title, subtitle, countLabel, children }) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {countLabel && <span className="dashboard-count-pill">{countLabel}</span>}
      </header>
      {children}
    </section>
  );
}

export default function Dashboard({ auth, onRequireLogin }) {
  const [donations, setDonations] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!auth?.isLoggedIn) {
      onRequireLogin();
      return;
    }
    const userId = auth.user?._id || auth.user?.id;
    if (!userId) return;

    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(`http://localhost:5000/api/user/donations?user_id=${userId}`, { headers })
       .then(res => res.json())
       .then(data => setDonations(Array.isArray(data) ? data : []))
       .catch(err => console.log("Error fetching donations:", err));
    
    fetch(`http://localhost:5000/api/user/pickups?user_id=${userId}`, { headers })
       .then(res => res.json())
       .then(data => setPickups(data))
       .catch(err => console.log("Error fetching pickups:", err));
    
    fetch(`http://localhost:5000/api/user/requests?user_id=${userId}`, { headers })
       .then(res => res.json())
       .then(data => setRequests(data))
       .catch(err => console.log("Error fetching requests:", err));
  }, [auth?.isLoggedIn, auth?.user?._id, auth?.user?.id, onRequireLogin]);

  if (!auth?.isLoggedIn) return null;

  const userType = auth.user?.user_type || auth.user?.role;
  const primaryItems = useMemo(() => {
    if (userType === 'ngo') return requests;
    if (userType === 'volunteer') return pickups;
    return donations;
  }, [donations, pickups, requests, userType]);

  const dashboardTitle =
    userType === 'ngo' ? 'My Requests' : userType === 'volunteer' ? 'My Pickups' : 'My Donations';

  const dashboardSubtitle =
    userType === 'ngo'
      ? 'Track food requests and monitor which requests are waiting or assigned.'
      : userType === 'volunteer'
        ? 'Follow assigned pickups and keep delivery status visible at a glance.'
        : 'Track your donations and their current status.';

  const summaryLabel =
    userType === 'ngo'
      ? `${requests.length} request${requests.length === 1 ? '' : 's'}`
      : userType === 'volunteer'
        ? `${pickups.length} pickup${pickups.length === 1 ? '' : 's'}`
        : `${donations.length} donation${donations.length === 1 ? '' : 's'}`;

  const statusSummary = primaryItems.reduce((accumulator, item) => {
    const tone = getStatusTone(item?.status);
    accumulator[tone] = (accumulator[tone] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="dashboard-page">
      <DashboardSection
        title={dashboardTitle}
        subtitle={dashboardSubtitle}
        countLabel={summaryLabel}
      >
        {primaryItems.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-visual">♡</div>
            <div>
              <h3>
                {userType === 'ngo'
                  ? 'No requests yet'
                  : userType === 'volunteer'
                    ? 'No pickups assigned yet'
                    : 'No donations yet'}
              </h3>
              <p>
                {userType === 'ngo'
                  ? 'Submit a request to start matching with available donations.'
                  : userType === 'volunteer'
                    ? 'Assigned pickups will appear here once they are available.'
                    : 'Start by donating food to see each item show up in this dashboard.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="dashboard-list">
            {primaryItems.map((item) => {
              const isDonation = userType === 'donor' || !userType;
              const category = isDonation ? getFoodCategory(item.food_name) : 'default';
              const thumbnail = isDonation ? getFoodThumbnailSrc(category) : getFoodThumbnailSrc('default');
              const itemTitle = isDonation
                ? `${item.food_name || 'Food item'} - ${item.quantity ?? '0'} servings`
                : userType === 'ngo'
                  ? `${item.requested_quantity ?? '0'} servings needed`
                  : `Pickup #${item._id}`;
              const metaLine = isDonation
                ? `Status: ${item.status || 'Unknown'}`
                : userType === 'ngo'
                  ? `Priority: ${item.priority || 'Normal'} • Status: ${item.status || 'Unknown'}`
                  : `Status: ${item.status || 'Unknown'}`;
              const dateValue = formatDate(item.createdAt || item.picked_at || item.delivered_at);
              const tone = getStatusTone(item.status);

              return (
                <article className="dashboard-list-item" key={item._id}>
                  <div className="dashboard-item-media">
                    <img
                      className="dashboard-item-image"
                      src={thumbnail}
                      alt={isDonation ? `${item.food_name || 'Food'} thumbnail` : 'Pickup thumbnail'}
                    />
                  </div>

                  <div className="dashboard-item-content">
                    <h3>{itemTitle}</h3>
                    <div className="dashboard-item-meta">
                      <span className={`dashboard-status-text is-${tone}`}>{metaLine}</span>
                      {dateValue && <span className="dashboard-item-date">{dateValue}</span>}
                    </div>
                    {!isDonation && userType === 'volunteer' && item.delivered_at && (
                      <div className="dashboard-item-submeta">
                        Delivered: {formatDate(item.delivered_at)}
                      </div>
                    )}
                  </div>

                  <div className={`dashboard-status-pill is-${tone}`}>
                    {item.status || 'Unknown'}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="dashboard-note">
          <span className="dashboard-note-icon">i</span>
          <p>Thank you for making a difference. Your activity keeps the donation flow moving.</p>
        </div>
      </DashboardSection>
    </div>
  );
}
