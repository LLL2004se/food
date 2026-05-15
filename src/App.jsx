import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Modal from './components/Modal';
import DarkMode from './components/DarkMode';
import ChatbotWidget from './components/ChatbotWidget';

import LandingPage from "./pages/LandingPage";
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Donations from './pages/Donations';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import DonorImpactDashboard from './pages/DonorImpactDashboard';
import NotificationPreferences from './pages/NotificationPreferences';

import DirectDonationForm from './forms/DirectDonationForm';
import MoneyDonationForm from './forms/MoneyDonationForm';
import RestaurantForm from './forms/RestaurantForm';

// NGO components
import NgoLayout from './ngo/components/NgoLayout';
import NgoDashboard from './ngo/pages/NgoDashboard';
import NgoDonationRequests from './ngo/pages/NgoDonationRequests';
import NgoPickups from './ngo/pages/NgoPickups';
import NgoVolunteers from './ngo/pages/NgoVolunteers';
import NgoReports from './ngo/pages/NgoReports';
import NgoProfile from './ngo/pages/NgoProfile';

// Volunteer components
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteerDelivery from './pages/VolunteerDelivery';

// Admin components
import AdminLayout from './admin/layout/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminUsers from './admin/pages/Users';
import AdminNgoRequests from './admin/pages/NgoRequests';
import AdminDonations from './admin/pages/Donations';
import AdminRequests from './admin/pages/Requests';
import AdminPickups from './admin/pages/Pickups';
import AdminNotifications from './admin/pages/Notifications';
import AiDashboard from './admin/pages/AiDashboard';
import AdminRoute from './admin/layout/AdminRoute';
import { UserRoute } from './admin/context/UserRoute.jsx';

function getInitialPageAndAuth() {
  const token = localStorage.getItem("token");
  const stored = localStorage.getItem("user");
  const savedPage = localStorage.getItem("currentPage");
  
  const validPages = [
    "landing", "login", "register", "home", "about", "contact", 
    "dashboard", "profile", "donor-impact", "notification", 
    "notification-preferences", "volunteer-dashboard", "volunteer-delivery",
    "admin-dashboard", "admin-users", "admin-ngo-requests", 
    "admin-donations", "admin-requests", "admin-pickups", 
    "admin-notifications", "admin-ai-analytics",
    "ngo-home", "ngo-donations", "ngo-pickups", 
    "ngo-volunteers", "ngo-reports", "ngo-profile", "ngo-notification"
  ];
  
  if (!token || !stored) {
    return { page: "landing", auth: { isLoggedIn: false, user: null } };
  }
  
  try {
    const parsed = JSON.parse(stored);
    const user = parsed?.user ?? parsed?.userData ?? parsed;
    if (!user) {
      return { page: "landing", auth: { isLoggedIn: false, user: null } };
    }
    
    let page = "home";
    if (user.user_type === "admin") {
      const candidate = (savedPage && savedPage.startsWith("admin")) ? savedPage : "admin-dashboard";
      page = validPages.includes(candidate) ? candidate : "admin-dashboard";
    } else if (user.user_type === "ngo") {
      const candidate = (savedPage && savedPage.startsWith("ngo")) ? savedPage : "ngo-donations";
      page = validPages.includes(candidate) ? candidate : "ngo-donations";
    } else {
      if (savedPage && validPages.includes(savedPage) && !savedPage.startsWith("admin") && !savedPage.startsWith("ngo")) {
        page = savedPage;
      }
    }
    
    return { page, auth: { isLoggedIn: true, user } };
  } catch (e) {
    return { page: "landing", auth: { isLoggedIn: false, user: null } };
  }
}

const initialState = getInitialPageAndAuth();

export default function App() {
  const [page, setPage] = useState(initialState.page);
  const [auth, setAuth] = useState(initialState.auth);
  const [showDirectDonate, setShowDirectDonate] = useState(false);
  const [showMoneyDonate, setShowMoneyDonate] = useState(false);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [moneyDonationsRefresh, setMoneyDonationsRefresh] = useState(0);

  const navigateToPage = (nextPage, options = {}) => {
    const { replace = false } = options;
    if (nextPage === page) return;

    if (replace) {
      window.history.replaceState({ page: nextPage }, "", window.location.href);
    } else {
      window.history.pushState({ page: nextPage }, "", window.location.href);
    }

    setPage(nextPage);
  };

  const navigateToLogin = () => {
    navigateToPage("login");
  };

  // Initialize browser history state and support Chrome back/forward navigation.
  useEffect(() => {
    window.history.replaceState({ page: initialState.page }, "", window.location.href);

    const handlePopState = (event) => {
      const statePage = event.state?.page;
      if (typeof statePage === "string") {
        setPage(statePage);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleAuthUpdate = (event) => {
      const nextUser = event.detail;
      if (nextUser) {
        setAuth({ isLoggedIn: true, user: nextUser });
      }
    };

    window.addEventListener('auth-updated', handleAuthUpdate);
    return () => window.removeEventListener('auth-updated', handleAuthUpdate);
  }, []);

  // Persist current page to localStorage
  useEffect(() => {
    if (page !== "landing" && page !== "login" && page !== "register") {
      localStorage.setItem("currentPage", page);
    }
  }, [page]);

  function handleLogout() {
    const currentPage = page;
    setAuth({ isLoggedIn: false, user: null });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentPage");
    if (currentPage === "home" || currentPage === "dashboard" || currentPage === "profile" || currentPage === "volunteer-dashboard" || currentPage === "volunteer-delivery" || currentPage.startsWith("admin") || currentPage.startsWith("ngo")) {
      navigateToLogin();
    }
  }

  // Check if current page is an admin page
  const isAdminPage = page.startsWith("admin");
  const isNgoPage = page.startsWith("ngo");

  // Protect admin pages - redirect to login if not authenticated or not admin
  useEffect(() => {
    if (isAdminPage && (!auth.isLoggedIn || auth.user?.user_type !== "admin")) {
      navigateToLogin();
    }
  }, [isAdminPage, auth.isLoggedIn, auth.user?.user_type]);

  // Protect NGO pages - redirect to login if not authenticated or not ngo
  useEffect(() => {
    if (isNgoPage && (!auth.isLoggedIn || auth.user?.user_type !== "ngo")) {
      navigateToLogin();
    }
  }, [isNgoPage, auth.isLoggedIn, auth.user?.user_type]);

  const showChatbot = !isAdminPage && !isNgoPage && page !== "landing" && page !== "login" && page !== "register";

  // Render admin pages with admin layout using AdminRoute
  if (isAdminPage) {
    return (
      <AdminRoute setPage={navigateToPage}>
        <AdminLayout auth={auth} onLogout={handleLogout} setPage={navigateToPage}>
          {page === "admin-dashboard" && <AdminDashboard setPage={navigateToPage} />}
          {page === "admin-users" && <AdminUsers />}
          {page === "admin-ngo-requests" && <AdminNgoRequests />}
          {page === "admin-donations" && <AdminDonations />}
          {page === "admin-requests" && <AdminRequests />}
          {page === "admin-pickups" && <AdminPickups />}
          {page === "admin-notifications" && <AdminNotifications />}
          {page === "admin-ai-analytics" && <AiDashboard />}
        </AdminLayout>
      </AdminRoute>
    );
  }

  // Render NGO pages with NGO layout
  if (isNgoPage && auth.isLoggedIn && auth.user?.user_type === "ngo") {
    return (
      <NgoLayout page={page} setPage={navigateToPage} auth={auth} onLogout={handleLogout}>
        {page === "ngo-home" && <NgoDashboard setPage={navigateToPage} />}
        {page === "ngo-donations" && <NgoDonationRequests />}
        {page === "ngo-pickups" && <NgoPickups />}
        {page === "ngo-volunteers" && <NgoVolunteers />}
        {page === "ngo-reports" && <NgoReports />}
        {page === "ngo-profile" && <NgoProfile />}
        {page === "ngo-notification" && <NotificationPreferences />}
      </NgoLayout>
    );
  }

  return (
    <>
      <DarkMode />
      <div className={`app-root ${page === "login" ? "login-page" : ""}`}>
      {
        page !== "login" && page !== "register" && page !== "landing" && !isNgoPage && (
          <Header
            page={page}
            setPage={navigateToPage}
            auth={auth}
            onLogout={handleLogout}
          />
        )
      }

      <main className={`container ${page === "volunteer-delivery" ? "container-wide" : ""}`}>
        {page === "landing" && <LandingPage onGetStarted={() => navigateToPage("home")} />}
        {page === "login" && (
          <Login
            onLogin={(user) => {
              setAuth({ isLoggedIn: true, user });
              if (user.token) localStorage.setItem("token", user.token);
              localStorage.setItem("user", JSON.stringify({ isLoggedIn: true, user }));
              if (user.user_type === "admin") {
                navigateToPage("admin-dashboard");
              } else if (user.user_type === "ngo") {
                navigateToPage("ngo-donations");
              } else {
                navigateToPage("home");
              }
            }}
            onSwitchToRegister={() => navigateToPage("register")}
          />
        )}
        {page === "register" && (
          <Register
            onRegister={(user) => {
              setAuth({ isLoggedIn: true, user });
              if (user.token) localStorage.setItem("token", user.token);
              localStorage.setItem("user", JSON.stringify({ isLoggedIn: true, user }));
              navigateToPage("home");
            }}
            onCancel={() => navigateToPage("login")}
          />
        )}
        {page === "home" && (
          <Home
            auth={auth}
            onRequireLogin={navigateToLogin}
            onDirectDonate={() => setShowDirectDonate(true)}
            onOpenRestaurant={() => setShowRestaurantForm(true)}
            onDonateMoney={() => setShowMoneyDonate(true)}
            moneyDonationsRefresh={moneyDonationsRefresh}
          />
        )}
        {page === "about" && <Donations />}
        {page === "contact" && <Contact />}
        {page === "dashboard" && <Dashboard auth={auth} onRequireLogin={navigateToLogin} />}
        {page === "profile" && <Profile auth={auth} onRequireLogin={navigateToLogin} />}
        {page === "donor-impact" && <DonorImpactDashboard auth={auth} />}
        {page === "notification" && <NotificationPreferences />}
        {page === "volunteer-dashboard" && <VolunteerDashboard setPage={navigateToPage} auth={auth} />}
        {page === "volunteer-delivery" && <VolunteerDelivery setPage={navigateToPage} auth={auth} />}

        {showDirectDonate && (
          <Modal title="Direct Donation" onClose={() => setShowDirectDonate(false)}>
            <DirectDonationForm auth={auth} onDone={() => setShowDirectDonate(false)} onRequireLogin={navigateToLogin} />
          </Modal>
        )}
        {showMoneyDonate && (
          <Modal title="Donate Money" onClose={() => setShowMoneyDonate(false)}>
            <MoneyDonationForm
              auth={auth}
              onDone={() => {
                setShowMoneyDonate(false);
                setMoneyDonationsRefresh((v) => v + 1);
              }}
              onRequireLogin={navigateToLogin}
            />
          </Modal>
        )}
        {showRestaurantForm && (
          <Modal title="Restaurant Food Donation" onClose={() => setShowRestaurantForm(false)}>
            <RestaurantForm auth={auth} onDone={() => setShowRestaurantForm(false)} onRequireLogin={navigateToLogin} />
          </Modal>
        )}
      </main>

      {!isAdminPage && !isNgoPage && page !== "login" && <Footer />}
      {showChatbot && <ChatbotWidget />}
      </div>
    </>
  );
}
