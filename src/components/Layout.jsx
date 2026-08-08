import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, MessageSquare, Trophy, Users, Settings, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { c, headingFont } from "../utils/theme";

const PAGES = [
  { id: "landing", label: "Home", path: "/", icon: Home, publicOnly: true },
  { id: "login", label: "Signup", path: "/login", icon: LogIn, publicOnly: true },
  { id: "dashboard", label: "Student dashboard", path: "/dashboard", icon: LayoutDashboard, studentOnly: true },
  { id: "chapters", label: "Chapter list", path: "/chapters", icon: BookOpen, studentOnly: true },
  { id: "tutor", label: "AI tutor chat", path: "/tutor", icon: MessageSquare, studentOnly: true },
  { id: "quiz", label: "Practice quiz", path: "/quiz", icon: Trophy, studentOnly: true },
  { id: "parent", label: "Parent dashboard", path: "/parent", icon: Users, studentOnly: true },
  { id: "admin", label: "Admin panel", path: "/admin", adminOnly: true },
];

export default function Layout({ children }) {
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

  function handleLogout() {
    localStorage.removeItem("studyyodha_user");
    localStorage.removeItem("studyyodha_user_role");
    navigate("/");
  }

  return (
    <div className="app-shell" style={{ background: c.bg }}>
      <div className="app-frame">
        {/* Sidebar navigation */}
        <div className="sidebar" style={{ background: c.dark, borderRight: `1px solid ${c.dark}` }}>
          {/* Logo */}
          <div className="sidebar-brand">
            <h1 style={{ ...headingFont }}>
              AdhyayanGuru
            </h1>
            <p className="sidebar-description">Adhyayan AI Tutor</p>
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
                >
                  {/* <span className="sidebar-number">{String(index + 1).padStart(2, "0")}</span> */}
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
