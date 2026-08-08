import { useLocation, Link } from "react-router-dom";
import { Home, BookOpen, MessageSquare, Trophy, Users, Settings, LogIn, LayoutDashboard } from "lucide-react";
import { c, headingFont } from "../utils/theme";

const PAGES = [
  { id: "landing", label: "Landing", path: "/", icon: Home },
  { id: "login", label: "Login / signup", path: "/login", icon: LogIn },
  { id: "dashboard", label: "Student dashboard", path: "/dashboard", icon: LayoutDashboard },
  { id: "chapters", label: "Chapter list", path: "/chapters", icon: BookOpen },
  { id: "tutor", label: "AI tutor chat", path: "/tutor", icon: MessageSquare },
  { id: "quiz", label: "Practice quiz", path: "/quiz", icon: Trophy },
  { id: "parent", label: "Parent dashboard", path: "/parent", icon: Users },
  { id: "admin", label: "Admin panel", path: "/admin", icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();

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
            {PAGES.map((page, index) => {
              const isActive = location.pathname === page.path;
              const Icon = page.icon;
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  <span className="sidebar-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>{page.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="sidebar-footer" />
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
