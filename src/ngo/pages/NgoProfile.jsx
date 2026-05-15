import React, { useState, useEffect } from 'react';
import LocationPickerMap from '../../components/LocationPickerMap';

function parseAddress(value = '') {
  const [building = '', block = '', city = ''] = value
    .split(',')
    .map((part) => part.trim());

  return { building, block, city };
}

function composeAddress(parts) {
  return [parts.building, parts.block, parts.city]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function formatLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function parseLocation(value = {}) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NG';
}

export default function NgoProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [addressParts, setAddressParts] = useState({
    building: '',
    block: '',
    city: ''
  });
  const [locationCoords, setLocationCoords] = useState({ lat: null, lng: null });

  useEffect(() => {
    fetchNgoProfile();
  }, []);

  async function fetchNgoProfile() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://food-backend-d44t.onrender.com/api/user/ngo-profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData(data);
        setAddressParts(parseAddress(data.address));
        setLocationCoords(parseLocation(data.location || data.address));
        setError("");
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load NGO profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        address: composeAddress(addressParts),
        location: Number.isFinite(locationCoords.lat) && Number.isFinite(locationCoords.lng)
          ? locationCoords
          : undefined
      };
      const res = await fetch("https://food-backend-d44t.onrender.com/api/user/ngo-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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
        setEditMode(false);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error updating profile");
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressPartChange = (field, value) => {
    setAddressParts(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAreasChange = (value) => {
    setFormData(prev => ({
      ...prev,
      area_of_service: value
    }));
  };

  const handleLocationSelect = ({ location, address }) => {
    if (location) {
      setLocationCoords(location);
    }

    if (address) {
      setAddressParts(prev => ({
        ...prev,
        ...address
      }));
    }
  };

  const serviceAreas = Array.isArray(profile.area_of_service)
    ? profile.area_of_service
    : typeof profile.area_of_service === 'string'
      ? profile.area_of_service.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  const completionScore = [
    profile.name,
    profile.phone,
    profile.address,
    profile.registration_number,
    profile.website,
    profile.description,
    profile.bio
  ].filter(Boolean).length;

  const completionPercent = Math.round((completionScore / 7) * 100);
  const statusLabel = profile.approval_status ? profile.approval_status.charAt(0).toUpperCase() + profile.approval_status.slice(1) : 'Pending';
  const statusTone = profile.approval_status === 'active' ? 'active' : profile.approval_status === 'rejected' ? 'rejected' : 'pending';
  const profileName = profile.name || 'NGO Organization';
  const profileImage = profile.profile_picture;
  const displayedAddressParts = parseAddress(profile.address);
  const displayedLocation = formatLocation(profile.location);
  const toggleEditMode = () => {
    if (editMode) {
      setFormData(profile);
      setAddressParts(parseAddress(profile.address));
      setLocationCoords(parseLocation(profile.location || profile.address));
    }
    setEditMode((prev) => !prev);
  };

  if (loading) return <div className="ngo-page"><p>Loading profile...</p></div>;

  return (
    <div className="ngo-page ngo-profile ngo-profile-page">
      <div className="ngo-profile-hero">
        <div className="ngo-profile-hero-main">
          <div className="ngo-profile-avatar" aria-hidden="true">
            {profileImage ? (
              <img src={profileImage} alt={`${profileName} logo`} />
            ) : (
              <span>{getInitials(profileName)}</span>
            )}
          </div>
          <div>
            <p className="ngo-profile-eyebrow">Organization profile</p>
            <h1>{profileName}</h1>
            <p className="ngo-profile-subtitle">
              Keep your NGO details accurate so donors, admins, and volunteers can trust and contact your organization.
            </p>
          </div>
        </div>

        <div className="ngo-profile-hero-meta">
          <div className="ngo-profile-chip-row">
            <span className={`ngo-status-badge ngo-status-${statusTone}`}>{statusLabel}</span>
            <span className="ngo-profile-chip">{completionPercent}% complete</span>
          </div>
          <button
            className={editMode ? "button-red" : "button-yellow"}
            onClick={toggleEditMode}
          >
            {editMode ? 'Cancel editing' : 'Edit profile'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="ngo-profile-grid">
        {!editMode ? (
          <div className="ngo-profile-view-grid">
            <section className="ngo-profile-card">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Identity</p>
                  <h2>Basic information</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field">
                  <label>Organization name</label>
                  <p>{profile.name || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Email</label>
                  <p>{profile.email || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Phone</label>
                  <p>{profile.phone || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Website</label>
                  <p>
                    {profile.website ? (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer">
                        {profile.website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="ngo-profile-card">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Compliance</p>
                  <h2>Registration details</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field">
                  <label>Registration number</label>
                  <p>{profile.registration_number || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Approval status</label>
                  <p>{statusLabel}</p>
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Mission / services</label>
                  <p>{profile.description || 'Add a short description of the people you support and the services you provide.'}</p>
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Biography</label>
                  <p>{profile.bio || 'Add a brief organization bio to help donors understand your work.'}</p>
                </div>
              </div>
            </section>

            <section className="ngo-profile-card ngo-profile-card-wide">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Location</p>
                  <h2>Address details</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field">
                  <label>Building</label>
                  <p>{displayedAddressParts.building || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Block</label>
                  <p>{displayedAddressParts.block || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field">
                  <label>City</label>
                  <p>{displayedAddressParts.city || 'Not provided'}</p>
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Coordinates</label>
                  <p>{displayedLocation || 'Geocoding failed or coordinates are not available yet.'}</p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="ngo-profile-edit-form">
            <section className="ngo-profile-card">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Identity</p>
                  <h2>Basic information</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Organization name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="ngo-profile-field">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    disabled
                  />
                </div>
                <div className="ngo-profile-field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="Contact number"
                  />
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="https://example.org"
                  />
                </div>
              </div>
            </section>

            <section className="ngo-profile-card">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Compliance</p>
                  <h2>Registration details</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field">
                  <label>Registration number</label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number || ''}
                    onChange={handleInputChange}
                    placeholder="Official registration ID"
                  />
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Mission / services</label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Describe the communities you serve and your key programs"
                  />
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Biography</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="A short organization bio for public viewing"
                  />
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Profile image URL</label>
                  <input
                    type="url"
                    name="profile_picture"
                    value={formData.profile_picture || ''}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </section>

            <section className="ngo-profile-card">
              <div className="ngo-profile-card-header">
                <div>
                  <p className="ngo-profile-card-label">Coverage</p>
                  <h2>Service areas and address</h2>
                </div>
              </div>
              <div className="ngo-profile-field-grid">
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Service areas</label>
                  <textarea
                    name="area_of_service"
                    value={Array.isArray(formData.area_of_service) ? formData.area_of_service.join(', ') : (formData.area_of_service || '')}
                    onChange={(e) => handleAreasChange(e.target.value)}
                    rows="3"
                    placeholder="City center, district 2, northern zone"
                  />
                  <p className="ngo-field-help">Separate multiple areas with commas.</p>
                </div>
                <div className="ngo-profile-field">
                  <label>Building</label>
                  <input
                    type="text"
                    value={addressParts.building}
                    onChange={(e) => handleAddressPartChange('building', e.target.value)}
                    placeholder="Building / house name"
                    required
                  />
                </div>
                <div className="ngo-profile-field">
                  <label>Block</label>
                  <input
                    type="text"
                    value={addressParts.block}
                    onChange={(e) => handleAddressPartChange('block', e.target.value)}
                    placeholder="Block / area"
                    required
                  />
                </div>
                <div className="ngo-profile-field">
                  <label>City</label>
                  <input
                    type="text"
                    value={addressParts.city}
                    onChange={(e) => handleAddressPartChange('city', e.target.value)}
                    placeholder="City / region"
                    required
                  />
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <label>Stored coordinates</label>
                  <p className="ngo-field-help">
                    {displayedLocation
                      ? `Current saved coordinates: ${displayedLocation}. They will refresh after you save the address.`
                      : 'No coordinates are stored for this profile yet. Save the address to geocode it automatically.'}
                  </p>
                </div>
                <div className="ngo-profile-field ngo-profile-field-full">
                  <LocationPickerMap
                    value={locationCoords}
                    onChange={setLocationCoords}
                    onLocationSelect={handleLocationSelect}
                    title="Precise location"
                    helpText="Search an address or click the map to set the exact NGO location that volunteers and donors will use."
                  />
                </div>
              </div>
            </section>

            <div className="form-actions ngo-profile-actions">
              <button type="submit" className="button-yellow">Save changes</button>
              <button type="button" className="button-red" onClick={toggleEditMode}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
