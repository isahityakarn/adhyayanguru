import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, Trophy, Users, Settings, LogIn, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Crown, Menu, X, History, FileCheck } from "lucide-react";
import { c, headingFont } from "../utils/theme";

const PAGES = [
  { id: "landing", label: "Home", path: "/", icon: Home, publicOnly: true },
  { id: "login", label: "Login", path: "/login", icon: LogIn, publicOnly: true },
  { id: "dashboard", label: "Student dashboard", path: "/dashboard", icon: LayoutDashboard, studentOnly: true },
  { id: "chapters", label: "Chapter list", path: "/chapters", icon: BookOpen, studentOnly: true },
  { id: "quiz", label: "Chapter Quiz", path: "/quiz", icon: Trophy, studentOnly: true },
  { id: "quiz-history", label: "My Quiz History", path: "/quiz-history", icon: History, studentOnly: true },
  { id: "plans", label: "Plans & Pricing", path: "/plans", icon: Crown, studentOnly: true },
  { id: "parent", label: "Parent dashboard", path: "/parent", icon: Users, studentOnly: true },
  { id: "admin", label: "Admin panel", path: "/admin", icon: Settings, adminOnly: true },
  { id: "admin-quizzes", label: "Quiz Management", path: "/admin/quizzes", icon: FileCheck, adminOnly: true },
];

export default function Layout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("studyyodha_user_role");
  const isStudent = userRole === "student";
  const isAdmin = userRole === "admin";
  const visiblePages = PAGES.filter((page) => {
    if (page.publicOnly) return !userRole;
    if (page.adminOnly) return isAdmin;
    return !page.studentOnly || isStudent;
  });

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("studyyodha_user");
    localStorage.removeItem("studyyodha_user_role");
    localStorage.removeItem("studyyodha_token");
    setIsMobileMenuOpen(false);
    navigate("/");
  }

  return (
    <div className="app-shell" style={{ background: c.bg }}>
      {/* Mobile Sticky Topbar */}
      <header className="mobile-topbar">
        <h1 style={{ ...headingFont, margin: 0, fontSize: "20px", color: "#f6f2e8" }}>
          AdhyayanGuru
        </h1>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            padding: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`app-frame ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Sidebar navigation */}
        <div
          className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}
          style={{ background: c.dark, borderRight: `1px solid ${c.dark}` }}
        >
          {/* Logo */}
          <div className="sidebar-brand">
            <h1 style={{ ...headingFont }}>
              AdhyayanGuru
            </h1>
            <p className="sidebar-description">Adhyayan AI Tutor</p>
            <button
              type="button"
              className="sidebar-layout-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              title={isSidebarCollapsed ? "Expand layout" : "Collapse layout"}
              aria-label={isSidebarCollapsed ? "Expand layout" : "Collapse layout"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="sidebar-nav">
            {visiblePages.map((page) => {
              const isActive = location.pathname === page.path;
              const Icon = page.icon;
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {Icon && <Icon size={18} aria-hidden="true" />}
                  <span>{page.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="sidebar-footer">
            {userRole && (
              <button type="button" className="sidebar-logout" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="main-scroll">
          <div className="main-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
