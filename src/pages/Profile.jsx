import React, { useEffect, useState } from 'react';
import LocationPickerMap from '../components/LocationPickerMap';
import './ProfileTabs.css';

function parseAddress(value = {}) {
  if (!value || typeof value !== 'object') {
    return { building: '', block: '', city: '' };
  }

  return {
    building: value.building || '',
    block: value.block || '',
    city: value.city || value.state || ''
  };
}

function composeAddress(parts) {
  return {
    building: parts.building.trim(),
    block: parts.block.trim(),
    city: parts.city.trim()
  };
}

function parseLocation(value = {}) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function formatLocation(value = {}) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

export default function Profile({ auth, onRequireLogin }) {
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [addressParts, setAddressParts] = useState({
    building: '',
    block: '',
    city: ''
  });
  const [locationCoords, setLocationCoords] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth?.isLoggedIn) {
      onRequireLogin();
    } else {
      fetchUserProfile();
    }
  }, [auth, onRequireLogin]);

  async function fetchUserProfile() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://food-backend-d44t.onrender.com/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData(data);
        setAddressParts(parseAddress(data.address));
        setLocationCoords(parseLocation(data.location || data.address));
        setError('');
      } else {
        const errData = await res.json();
        setError('Failed to load profile: ' + (errData.error || res.statusText));
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        address: composeAddress(addressParts),
        location: Number.isFinite(locationCoords.lat) && Number.isFinite(locationCoords.lng)
          ? locationCoords
          : undefined
      };

      const res = await fetch('https://food-backend-d44t.onrender.com/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setFormData(updated);
        setAddressParts(parseAddress(updated.address));
        setLocationCoords(parseLocation(updated.location || updated.address));
        localStorage.setItem('user', JSON.stringify({ isLoggedIn: true, user: updated }));
        window.dispatchEvent(new CustomEvent('auth-updated', { detail: updated }));
        setEditMode(false);
        setError('');
        alert('Profile updated successfully!');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error updating profile: ' + err.message);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setAddressParts((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelect = ({ location, address }) => {
    if (location) {
      setLocationCoords(location);
    }

    if (address) {
      setAddressParts((prev) => ({
        ...prev,
        ...address
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        setFormData((prev) => ({
          ...prev,
          profile_picture: reader.result
        }));
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.5;
          let compressedImage = canvas.toDataURL('image/jpeg', quality);

          while (compressedImage.length > 500000 && quality > 0.1) {
            quality -= 0.1;
            compressedImage = canvas.toDataURL('image/jpeg', quality);
          }

          setFormData((prev) => ({
            ...prev,
            profile_picture: compressedImage
          }));
          setError('');
        } catch (err) {
          console.error('Compression error:', err);
          setError('Failed to compress image');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const toggleEditMode = () => {
    if (editMode) {
      setFormData(profile);
      setAddressParts(parseAddress(profile.address));
      setLocationCoords(parseLocation(profile.location || profile.address));
    }
    setEditMode((prev) => !prev);
  };

  if (!auth?.isLoggedIn) return null;
  if (loading) return <div className="profile-container"><p>Loading profile...</p></div>;

  const profileName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.name || 'My Profile';
  const profileImage = profile.profile_picture;
  const address = parseAddress(profile.address);
  const savedLocation = formatLocation(profile.location || profile.address);
  const completionScore = [
    profile.first_name,
    profile.last_name,
    profile.username,
    profile.phone,
    profile.bio,
    address.building,
    address.block,
    address.city,
    savedLocation,
    profile.profile_picture
  ].filter(Boolean).length;
  const completionPercent = Math.round((completionScore / 9) * 100);

  return (
    <section className="profile-section profile-page">
      <div className="profile-container profile-shell">
        <div className="profile-hero">
          <div className="profile-hero-main">
            <div className="profile-picture-section profile-avatar-shell">
              {!editMode && profileImage && (
                <img src={profileImage} alt="Profile" className="profile-picture-display profile-avatar-image" />
              )}
              {!editMode && !profileImage && (
                <div className="profile-picture-placeholder profile-avatar-placeholder">
                  <span>{getInitials(profileName)}</span>
                </div>
              )}
              {editMode && (
                <div className="profile-picture-edit">
                  {formData.profile_picture && (
                    <img src={formData.profile_picture} alt="Profile Preview" className="profile-picture-preview profile-avatar-image" />
                  )}
                  {!formData.profile_picture && (
                    <div className="profile-picture-placeholder profile-avatar-placeholder">
                      <span>{getInitials(profileName)}</span>
                    </div>
                  )}
                  <label className="upload-label">
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    Choose File
                  </label>
                </div>
              )}
            </div>

            <div className="profile-hero-text">
              <p className="profile-eyebrow">User profile</p>
              <h1>{profileName}</h1>
              <p className="profile-email">{profile.email}</p>
              <p className="profile-subtitle">
                Keep your account details, contact information, and address accurate so donation and delivery workflows stay smooth.
              </p>
            </div>
          </div>

          <div className="profile-hero-meta">
            <div className="profile-chip-row">
              <span className="profile-chip">{profile.user_type || 'User'}</span>
              <span className="profile-chip">{completionPercent}% complete</span>
            </div>
            <button
              className={`profile-edit-btn ${editMode ? 'cancel' : 'edit'}`}
              onClick={toggleEditMode}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!editMode ? (
          <div className="profile-card-grid">
            <section className="profile-card">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-label">Identity</p>
                  <h2>Basic information</h2>
                </div>
              </div>
              <div className="profile-field-grid">
                <div className="profile-field">
                  <label>First name</label>
                  <p>{profile.first_name || 'Not provided'}</p>
                </div>
                <div className="profile-field">
                  <label>Last name</label>
                  <p>{profile.last_name || 'Not provided'}</p>
                </div>
                <div className="profile-field">
                  <label>Username</label>
                  <p>{profile.username || 'Not provided'}</p>
                </div>
                <div className="profile-field">
                  <label>Phone</label>
                  <p>{profile.phone || 'Not provided'}</p>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-label">Account</p>
                  <h2>Profile details</h2>
                </div>
              </div>
              <div className="profile-field-grid">
                <div className="profile-field profile-field-full">
                  <label>Email</label>
                  <p>{profile.email || 'Not provided'}</p>
                </div>
                <div className="profile-field profile-field-full">
                  <label>Bio</label>
                  <p>{profile.bio || 'Add a short bio so others can know more about you.'}</p>
                </div>
              </div>
            </section>

            <section className="profile-card profile-card-wide">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-label">Location</p>
                  <h2>Address details</h2>
                </div>
              </div>
              <div className="profile-field-grid">
                <div className="profile-field">
                  <label>Building</label>
                  <p>{address.building || 'Not provided'}</p>
                </div>
                <div className="profile-field">
                  <label>Block</label>
                  <p>{address.block || 'Not provided'}</p>
                </div>
                <div className="profile-field">
                  <label>City</label>
                  <p>{address.city || 'Not provided'}</p>
                </div>
                <div className="profile-field profile-field-full">
                  <label>Coordinates</label>
                  <p>{savedLocation || 'No coordinates saved yet'}</p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="profile-edit-form profile-card-grid">
            <section className="profile-card">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-label">Identity</p>
                  <h2>Basic information</h2>
                </div>
              </div>
              <div className="profile-field-grid">
                <div className="profile-field">
                  <label>First name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="profile-field">
                  <label>Last name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="profile-field">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ''}
                    onChange={handleInputChange}
                    placeholder="Choose a username"
                  />
                </div>
                <div className="profile-field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    placeholder="Contact number"
                  />
                </div>
                <div className="profile-field profile-field-full">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Tell others about yourself..."
                    maxLength="250"
                  />
                  <p className="char-count">{(formData.bio || '').length} / 250</p>
                </div>
              </div>
            </section>

            <section className="profile-card profile-card-wide">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-label">Location</p>
                  <h2>Address details</h2>
                </div>
              </div>
              <div className="profile-field-grid">
                <div className="profile-field">
                  <label>Building</label>
                  <input
                    type="text"
                    value={addressParts.building}
                    onChange={(e) => handleAddressChange('building', e.target.value)}
                    placeholder="Building / house name"
                  />
                </div>
                <div className="profile-field">
                  <label>Block</label>
                  <input
                    type="text"
                    value={addressParts.block}
                    onChange={(e) => handleAddressChange('block', e.target.value)}
                    placeholder="Block / area"
                  />
                </div>
                <div className="profile-field">
                  <label>City</label>
                  <input
                    type="text"
                    value={addressParts.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="City / region"
                  />
                </div>
                <div className="profile-field profile-field-full">
                  <LocationPickerMap
                    value={locationCoords}
                    onChange={setLocationCoords}
                    onLocationSelect={handleLocationSelect}
                    title="Precise location"
                    helpText="Search an address or click the map to set the exact location for this profile."
                  />
                </div>
              </div>
            </section>

            <div className="form-actions profile-actions">
              <button type="submit" className="btn-save">Save Changes</button>
              <button type="button" className="btn-cancel" onClick={toggleEditMode}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
