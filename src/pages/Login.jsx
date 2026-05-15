import React, { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login({ onLogin, onSwitchToRegister }) {
  const [loginType, setLoginType] = useState("user"); // "user", "ngo", or "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ngoEmail, setNgoEmail] = useState("");
  const [ngoPassword, setNgoPassword] = useState("");
  const [showNgoPassword, setShowNgoPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);

  async function loginWithBackend(emailValue, passwordValue, userType = "user") {
    try {
      const res = await fetch("https://food-backend-d44t.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue.trim(), password: passwordValue, user_type: userType }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || "Login failed");
        return;
      }

      const mappedUser = {
        _id: data.user?.id,
        name: data.user?.name,
        user_type: data.user?.role,
        email: data.user?.email || emailValue,
        token: data.token,
      };

      onLogin(mappedUser);
    } catch (err) {
      console.error("Login error:", err);
      alert("Unable to connect to server. Please try again.");
    }
  }

  async function loginWithGoogleCredential(credential) {
    if (!credential) return;

    try {
      setGoogleError("");
      setGoogleLoading(true);

      const res = await fetch("https://food-backend-d44t.onrender.com/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setGoogleError(data?.message || "Google login failed");
        return;
      }

      const mappedUser = {
        _id: data.user?.id,
        name: data.user?.name,
        user_type: data.user?.role,
        email: data.user?.email,
        token: data.token,
      };

      onLogin(mappedUser);
    } catch (err) {
      console.error("Google login error:", err);
      setGoogleError("Unable to connect to server. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    if (loginType !== "user") return;

    if (!GOOGLE_CLIENT_ID) {
      setGoogleError("Google login is not configured yet.");
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || googleInitializedRef.current || !window.google?.accounts?.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          loginWithGoogleCredential(response.credential);
        },
      });
      googleInitializedRef.current = true;

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: googleButtonRef.current.clientWidth || 320,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const scriptId = "google-identity-services";
    let script = document.getElementById(scriptId);
    const handleLoad = () => renderGoogleButton();

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleLoad);

    return () => {
      cancelled = true;
      googleInitializedRef.current = false;
      script.removeEventListener("load", handleLoad);
    };
  }, [loginType]);

  async function submitUserLogin(e) {
    e.preventDefault();
    if (!email || !password)
      return alert("Please enter email and password");
    await loginWithBackend(email, password, "user");
  }

  async function submitNgoLogin(e) {
    e.preventDefault();
    if (!ngoEmail || !ngoPassword)
      return alert("Please enter NGO email and password");
    await loginWithBackend(ngoEmail, ngoPassword, "ngo");
  }

  async function submitAdminLogin(e) {
    e.preventDefault();
    if (!adminEmail || !adminPassword)
      return alert("Please enter admin email and password");
    await loginWithBackend(adminEmail, adminPassword, "admin");
  }

  const tabIcons = {
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    ngo: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h16M6 20V5h12v15M9 9h2m2 0h2M9 12h2m2 0h2M9 15h2m2 0h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 9v4m0 3h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <section className="login-section">
      <div className="left-section">
        <p>
          Join Helping Hands NGO — a community working together to bring hope, kindness,
          and real change to those in need. Sign in and start making a difference today!
        </p>
      </div>

      {/* Right side (login forms) */}
      <div className="right-section">
        {/* Login Type Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${loginType === "user" ? "active" : ""}`}
            onClick={() => setLoginType("user")}
          >
            <span className="login-tab-icon">{tabIcons.user}</span>
            <span className="login-tab-label">User<br />Login</span>
          </button>
          <button
            type="button"
            className={`login-tab ${loginType === "ngo" ? "active" : ""}`}
            onClick={() => setLoginType("ngo")}
          >
            <span className="login-tab-icon">{tabIcons.ngo}</span>
            <span className="login-tab-label">NGO<br />Login</span>
          </button>
          <button
            type="button"
            className={`login-tab ${loginType === "admin" ? "active" : ""}`}
            onClick={() => setLoginType("admin")}
          >
            <span className="login-tab-icon">{tabIcons.admin}</span>
            <span className="login-tab-label">Admin<br />Login</span>
          </button>
        </div>

        {/* User Login Form */}
        {loginType === "user" && (
          <>
            <h1>Log in to your account</h1>
            <form onSubmit={submitUserLogin} className="form-scroll">
              <div className="container">
                <label htmlFor="email"><b>Email</b></label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <label htmlFor="password"><b>Password</b></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "20px",
                      padding: "5px",
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <label className="remember">
                  Remember me
                  <input type="checkbox" defaultChecked />
                </label>

                <div className="container-btn">
                  <button type="submit">Login</button>
                  <button
                    type="button"
                    className="cancelbtn"
                    onClick={() => setEmail("") || setPassword("")}
                  >
                    Cancel
                  </button>
                  {/* <span className="psw">
                    <a href="#">Forgot password?</a>
                  </span> */}
                </div>

                <div className="google-login-divider">
                  <span>or</span>
                </div>

                <div className="google-login-box">
                  <div ref={googleButtonRef} className="google-login-button" />
                  {googleLoading ? <p className="google-login-status">Signing in with Google...</p> : null}
                  {googleError ? <p className="google-login-error">{googleError}</p> : null}
                </div>

                <div className="register-link">
                  Don't have an account?{" "}
                  <span
                    style={{ color: "#2563eb", cursor: "pointer" }}
                    onClick={onSwitchToRegister}
                  >
                    Register
                  </span>
                </div>
              </div>
            </form>
          </>
        )}

        {/* NGO Login Form */}
        {loginType === "ngo" && (
          <>
            <h1>NGO Login</h1>
            <form onSubmit={submitNgoLogin} className="form-scroll">
              <div className="container">
                <label htmlFor="ngo-email"><b>Email</b></label>
                <input
                  type="email"
                  placeholder="Enter your NGO email"
                  name="ngo-email"
                  value={ngoEmail}
                  onChange={(e) => setNgoEmail(e.target.value)}
                  required
                />

                <label htmlFor="ngo-password"><b>Password</b></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showNgoPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    name="ngo-password"
                    value={ngoPassword}
                    onChange={(e) => setNgoPassword(e.target.value)}
                    required
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNgoPassword(!showNgoPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "20px",
                      padding: "5px",
                    }}
                    title={showNgoPassword ? "Hide password" : "Show password"}
                  >
                    {showNgoPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <label className="remember">
                  Remember me
                  <input type="checkbox" defaultChecked />
                </label>

                <div className="container-btn">
                  <button type="submit">Login</button>
                  <button
                    type="button"
                    className="cancelbtn"
                    onClick={() => setNgoEmail("") || setNgoPassword("")}
                  >
                    Cancel
                  </button>
                  {/* <span className="psw">
                    <a href="#">Forgot password?</a>
                  </span> */}
                </div>

                <div className="register-link">
                  Don't have an account?{" "}
                  <span
                    style={{ color: "#2563eb", cursor: "pointer" }}
                    onClick={onSwitchToRegister}
                  >
                    Register as NGO
                  </span>
                </div>
              </div>
            </form>
          </>
        )}

        {/* Admin Login Form */}
        {loginType === "admin" && (
          <>
            <h1>Admin Login</h1>
            <div className="admin-login-notice">
              <p>⚠️ Admin access only. Unauthorized access is prohibited.</p>
            </div>
            <form onSubmit={submitAdminLogin} className="form-scroll">
              <div className="container">
                <label htmlFor="admin-username"><b>Email</b></label>
                <input
                  type="email"
                  placeholder="Enter admin email"
                  name="admin-email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />

                <label htmlFor="admin-password"><b>Password</b></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    name="admin-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "20px",
                      padding: "5px",
                    }}
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <label className="remember">
                  Remember me
                  <input type="checkbox" defaultChecked />
                </label>

                <div className="container-btn">
                  <button type="submit">Login</button>
                  <button
                    type="button"
                    className="cancelbtn"
                    onClick={() => {
                      setAdminEmail("");
                      setAdminPassword("");
                    }}
                  >
                    Cancel
                  </button>
                  {/* <span className="psw">
                    <a href="#">Forgot password?</a>
                  </span> */}
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
