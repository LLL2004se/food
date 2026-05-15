import { useCallback, useEffect, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";

// Simple icon components
const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 2.5H8.33333V8.33333H2.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6667 2.5H17.5V8.33333H11.6667V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 11.6667H8.33333V17.5H2.5V11.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6667 11.6667H17.5V17.5H11.6667V11.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
    <path d="M10 12.5C5.58172 12.5 2 13.8427 2 15.5556V20H18V15.5556C18 13.8427 14.4183 12.5 10 12.5Z" fill="currentColor"/>
  </svg>
);

const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 5L10 1.25L17.5 5M2.5 5L10 8.75M2.5 5V15L10 18.75M17.5 5L10 8.75M17.5 5V15L10 18.75M10 8.75V18.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TableIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 2.5H17.5V17.5H2.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 6.66667H17.5M6.66667 2.5V17.5M13.3333 2.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2.5C7.23858 2.5 5 4.73858 5 7.5V11.25L2.5 13.75V15H17.5V13.75L15 11.25V7.5C15 4.73858 12.7614 2.5 10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 15V16.25C7.5 17.6307 8.61929 18.75 10 18.75C11.3807 18.75 12.5 17.6307 12.5 16.25V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HorizontaLDots = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="5" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 17.5H17.5M15 17.5V5M10 17.5V2.5M5 17.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AdminSidebar = ({ setPage }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [subMenuHeight, setSubMenuHeight] = useState({});
  const subMenuRefs = useRef({});

  const navItems = [
    {
      icon: <GridIcon />,
      name: "Dashboard",
      path: "admin-dashboard",
    },
    {
      icon: <UserIcon />,
      name: "Users",
      path: "admin-users",
    },
    {
      icon: <BoxIcon />,
      name: "NGO Requests",
      path: "admin-ngo-requests",
    },
    {
      icon: <BoxIcon />,
      name: "Donations",
      path: "admin-donations",
    },
    {
      icon: <ListIcon />,
      name: "Requests",
      path: "admin-requests",
    },
    {
      icon: <TableIcon />,
      name: "Pickups",
      path: "admin-pickups",
    },
    {
      icon: <BellIcon />,
      name: "Notifications",
      path: "admin-notifications",
    },
    {
      icon: <ChartIcon />,
      name: "AI Analytics",
      path: "admin-ai-analytics",
    },
  ];

  const handleSubmenuToggle = (index) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = openSubmenu;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  return (
    <aside
      className={`admin-bg admin-text admin-border fixed mt-16 flex flex-col lg:static lg:mt-0 lg:h-screen px-5 top-0 left-0 transition-all duration-300 ease-in-out z-50 border-r 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        {(isExpanded || isHovered || isMobileOpen) ? (
          <img 
            src="/ChatGPT Image Feb 16, 2026, 07_54_00 PM.png" 
            alt="Food-Print Logo" 
            className="h-10 w-auto"
          />
        ) : (
          <img 
            src="/ChatGPT Image Feb 16, 2026, 07_54_00 PM.png" 
            alt="Food-Print Logo" 
            className="h-8 w-8 object-contain"
          />
        )}
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="admin-sidebar-nav-group">
              <h2
                className={`admin-text-muted mb-4 text-xs uppercase flex leading-[20px] ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                {navItems.map((nav, index) => (
                  <li key={nav.name}>
                    <button
                      onClick={() => setPage(nav.path)}
                      className={`menu-item group menu-item-inactive cursor-pointer ${
                        !isExpanded && !isHovered
                          ? "lg:justify-center"
                          : "lg:justify-start"
                      }`}
                    >
                      <span className="menu-item-icon-size menu-item-icon-inactive">
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{nav.name}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
