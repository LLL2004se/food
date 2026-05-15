import React, { useState } from "react";

export default function Register({ onRegister, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState("");
  const [building, setBuilding] = useState("");
  const [block, setBlock] = useState("");
  const [road, setRoad] = useState("");
  const [state, setState] = useState("");
  const [location, setLocation] = useState({ lat: null, lng: null });
  
  // NGO specific fields
  const [ngoRegistrationNumber, setNgoRegistrationNumber] = useState("");
  const [ngoWebsite, setNgoWebsite] = useState("");
  const [ngoServices, setNgoServices] = useState("");
  
  // Volunteer specific fields
  const [volunteerSkills, setVolunteerSkills] = useState("");
  const [volunteerExperience, setVolunteerExperience] = useState("");
  const [volunteerAvailability, setVolunteerAvailability] = useState("");

  // Get user's location if available
  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }

  React.useEffect(() => {
    getLocation();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationType, setRegistrationType] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!userType)
      return alert("Please select your user type");

    if (!email || !password || !confirmPassword || !name || !phone)
      return alert("Please fill all required fields");

    if (password !== confirmPassword)
      return alert("Passwords do not match");

    setLoading(true);
    try {
      const registrationData = {
        name,
        email,
        phone,
        password,
        user_type: userType,
        address: {
          building: building || undefined,
          block: block || undefined,
          road: road || undefined,
          state: state || undefined,
        },
        location: location.lat && location.lng ? location : undefined,
      };

      // Add type-specific fields
      if (userType === "ngo") {
        registrationData.ngo_registration_number = ngoRegistrationNumber;
        registrationData.ngo_website = ngoWebsite;
        registrationData.ngo_services = ngoServices;
      } else if (userType === "volunteer") {
        registrationData.volunteer_skills = volunteerSkills;
        registrationData.volunteer_experience = volunteerExperience;
        registrationData.volunteer_availability = volunteerAvailability;
      }

      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Registration failed");
        setLoading(false);
        return;
      }

      // For NGO, don't auto-login - show pending approval message
      if (userType === "ngo") {
        setRegistrationSuccess(true);
        setRegistrationType("ngo");
        setLoading(false);
        return;
      }

      // For Donor and Volunteer, proceed with auto-login
      const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const loginData = await loginRes.json().catch(() => ({}));

      if (!loginRes.ok) {
        setError("Account created. Please log in.");
        setLoading(false);
        return;
      }

      setRegistrationSuccess(true);
      setRegistrationType(userType);
      onRegister({
        _id: loginData.user?.id,
        name: loginData.user?.name,
        user_type: loginData.user?.role,
        email,
        token: loginData.token,
      });
    } catch (err) {
      console.error("Register error:", err);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-section">
      {/* Left Info Section */}
      <div className="left-section">
        <h2>Join Our Mission 💚</h2>
        <p>
          Become part of a growing community of donors, NGOs, and restaurants
          working together to eliminate hunger and reduce waste.
        </p>
      </div>

      {/* Right Form Section */}
      <div className="right-section">
        {registrationSuccess && registrationType === "ngo" ? (
          <div className="success-message-container">
            <div className="success-icon">✓</div>
            <h1>NGO Registration Submitted!</h1>
            <p className="success-message">
              Thank you for registering with us! Your NGO registration has been submitted for admin approval.
            </p>
            <p className="success-subtext">
              An administrator will review your information and contact you shortly at <strong>{email}</strong> to confirm your registration.
            </p>
            <div className="success-steps">
              <p className="step-title">What happens next?</p>
              <ul>
                <li>✓ Your organization details will be verified</li>
                <li>✓ You'll receive an approval confirmation email</li>
                <li>✓ You can log in once approved</li>
              </ul>
            </div>
            <button
              onClick={onCancel}
              className="success-action-btn"
            >
              Back to Login
            </button>
          </div>
        ) : registrationSuccess && (registrationType === "donor" || registrationType === "volunteer") ? (
          <div className="success-message-container">
            <div className="success-icon">✓</div>
            <h1>Registration Complete!</h1>
            <p className="success-message">
              Welcome! You can now use all features of our platform.
            </p>
            <button
              onClick={onCancel}
              className="success-action-btn"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <h1>Create an Account</h1>
            {error && (
              <div className="form-error-box">
                {error}
              </div>
            )}
            <form onSubmit={submit} className="form-scroll">
          <div className="container">
            <div className="register-type">
              <button
                type="button"
                className={userType === "donor" ? "register-type-btn active" : "register-type-btn"}
                onClick={() => setUserType("donor")}
              >
                Donor
              </button>
              <button
                type="button"
                className={userType === "ngo" ? "register-type-btn active" : "register-type-btn"}
                onClick={() => setUserType("ngo")}
              >
                NGO
              </button>
              <button
                type="button"
                className={userType === "volunteer" ? "register-type-btn active" : "register-type-btn"}
                onClick={() => setUserType("volunteer")}
              >
                Volunteer
              </button>
            </div>

            <label>Name {userType === "ngo" ? "/ Organization Name" : ""}</label>
            <input
              type="text"
              placeholder={userType === "ngo" ? "Enter organization name" : "Enter your name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label>Phone</label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <label>Building / House Number</label>
            <input
              type="text"
              placeholder="e.g., 123, Building A"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />

            <label>Block / Area</label>
            <input
              type="text"
              placeholder="e.g., Block C, Sector 5"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
            />

            <label>Road / Street Number</label>
            <input
              type="text"
              placeholder="e.g., Main Road, Street No 12"
              value={road}
              onChange={(e) => setRoad(e.target.value)}
            />

            <label>State / Province</label>
            <input
              type="text"
              placeholder="e.g., Maharashtra, California"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />

            {/* NGO Specific Fields */}
            {userType === "ngo" && (
              <>
                <label>NGO Registration Number *</label>
                <input
                  type="text"
                  placeholder="Enter registration/license number"
                  value={ngoRegistrationNumber}
                  onChange={(e) => setNgoRegistrationNumber(e.target.value)}
                  required
                />

                <label>Website (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yourorganization.org"
                  value={ngoWebsite}
                  onChange={(e) => setNgoWebsite(e.target.value)}
                />

                <label>Services Provided *</label>
                <textarea
                  placeholder="Describe the services your NGO provides..."
                  value={ngoServices}
                  onChange={(e) => setNgoServices(e.target.value)}
                  rows="3"
                  required
                />
              </>
            )}

            {/* Volunteer Specific Fields */}
            {userType === "volunteer" && (
              <>
                <label>Skills *</label>
                <textarea
                  placeholder="List your skills (e.g., cooking, delivery, organizing)"
                  value={volunteerSkills}
                  onChange={(e) => setVolunteerSkills(e.target.value)}
                  rows="2"
                  required
                />

                <label>Experience (Optional)</label>
                <textarea
                  placeholder="Describe your volunteering experience..."
                  value={volunteerExperience}
                  onChange={(e) => setVolunteerExperience(e.target.value)}
                  rows="2"
                />

                <label>Availability *</label>
                <select
                  value={volunteerAvailability}
                  onChange={(e) => setVolunteerAvailability(e.target.value)}
                  required
                >
                  <option value="">Select availability</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                  <option value="flexible">Flexible</option>
                </select>
              </>
            )}

            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="container-btn">
              <button type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <button
                type="button"
                className="cancelbtn"
                onClick={onCancel}
              >
                Back to Login
              </button>
            </div>
          </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
