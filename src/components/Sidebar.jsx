import React from "react";

export const ADMIN_MENU = [
  { id: "dashboard", label: "Dashboard", view: "viewAdminDashboard", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>` },
  { id: "inventory", label: "Inventory", view: "viewAdminInventory", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>` },
  { id: "slab_engine", label: "Slab Engine", view: "viewAdminSlabEngine", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>` },
  { id: "analytics", label: "Analytics", view: "viewAdminAnalytics", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>` },
  { id: "officers", label: "Officers", view: "viewAdminOfficers", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` }
];

export const OFFICER_MENU = [
  { id: "dashboard", label: "Dashboard", view: "viewOfficerDashboard", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>` },
  { id: "sales_entry", label: "Sales Entry", view: "viewOfficerSalesEntry", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>` },
  { id: "performance", label: "Performance", view: "viewOfficerPerformance", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-4 h-4"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>` }
];

export default function Sidebar({ currentUser, activeMenu, setActiveMenu, onLogout, activeOfficer, activeAdmin }) {
  const menuList = currentUser === "admin" ? ADMIN_MENU : OFFICER_MENU;
  
  let initials = "AT";
  let name = "Admin";
  let roleText = "Administrator";

  if (currentUser === "admin" && activeAdmin) {
    // Dynamic admin profile from database signup
    name = activeAdmin.name || "Administrator";
    initials = activeAdmin.initials
      ? activeAdmin.initials
      : (name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : "AD");
    roleText = activeAdmin.region || "Region Admin";
  } else if (currentUser === "officer" && activeOfficer) {
    // Dynamic officer profile from database signup
    name = activeOfficer.name || "Sales Officer";
    initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : "SO";
    roleText = `${activeOfficer.hub || "Hub"} • ${activeOfficer.region || "KA-01"}`;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-container">
          <span className="brand-toyota">TOYOTA</span> <span className="brand-smart">REVORA</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">{currentUser === "admin" ? "ADMIN CONSOLE" : "OFFICER CONSOLE"}</div>
          <ul className="sidebar-menu">
            {menuList.map(item => (
              <li
                key={item.id}
                className={`sidebar-menu-item ${activeMenu === item.id ? "active" : ""}`}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (window.onSearchQueryClear) window.onSearchQueryClear();
                }}
              >
                <div className="sidebar-menu-item-left">
                  <span dangerouslySetInnerHTML={{ __html: item.icon }}></span>
                  <span>{item.label}</span>
                </div>
                {activeMenu === item.id && <span className="nav-bullet"></span>}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="sidebar-profile-card">
        <div className="profile-avatar-container">
          <div className="profile-avatar-circle">{initials}</div>
          <div className="profile-details">
            <div className="profile-name">{name}</div>
            <div className="profile-role">{roleText}</div>
          </div>
        </div>
        <button className="btn-signout" onClick={onLogout} title="Sign Out">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
