import React from "react";
import { SidebarProvider } from "../context/SidebarContext";
import AdminHeader from "./AdminHeader";
import Backdrop from "./Backdrop";
import AdminSidebar from "./AdminSidebar";
import { useSidebar } from "../context/SidebarContext";

const THEME_KEY = "theme";

const LayoutContent = ({ children, auth, onLogout, setPage }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex admin-layout-root">
      <div className="admin-sidebar-wrapper">
        <AdminSidebar setPage={setPage} />
        <Backdrop />
      </div>
      <div
        className="admin-bg admin-text flex-1 min-h-screen transition-all duration-300 ease-in-out"
      >
        <AdminHeader auth={auth} onLogout={onLogout} />
        <div className="admin-main-inner p-4 mx-auto max-w-7xl md:p-6">
          {React.isValidElement(children)
            ? React.cloneElement(children, { setPage })
            : children}
        </div>
      </div>
    </div>
  );
};

const AdminLayout = ({ children, auth, onLogout, setPage }) => {
  // Initialize theme from localStorage on mount
  React.useEffect(() => {
    try {
      const adminLayout = document.querySelector(".admin-layout-root");
      const storedTheme = localStorage.getItem(THEME_KEY + "_admin");
      if (adminLayout && (storedTheme === "dark" || storedTheme === "light")) {
        adminLayout.setAttribute("data-theme", storedTheme);
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  return (
    <SidebarProvider>
      <LayoutContent auth={auth} onLogout={onLogout} setPage={setPage}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
};

export default AdminLayout;
