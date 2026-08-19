import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ChapterListPage from "./pages/ChapterList";
import TutorChatPage from "./pages/TutorChat";
import QuizPage from "./pages/Quiz";
import ParentDashboardPage from "./pages/ParentDashboard";
import PlansPage from "./pages/Plans";
import AdminPage from "./pages/Admin";
import AdminUploadPage from "./pages/AdminUpload";
import SubscriptionGuard from "./utils/SubscriptionGuard";
import "./App.css";

function AdminRoute({ children }) {
  const role = localStorage.getItem("studyyodha_user_role");
  const isAdmin = role === "admin";
  if (!isAdmin) return <Navigate to="/login" replace />;
  return children || <AdminPage />;
}

function StudentRoute({ children }) {
  const role = localStorage.getItem("studyyodha_user_role");
  const token = localStorage.getItem("studyyodha_token");
  const isAuthenticated = role === "student" || role === "admin" || Boolean(token);
  return isAuthenticated
    ? children
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<StudentRoute><DashboardPage /></StudentRoute>} />
          <Route path="/plans" element={<StudentRoute><PlansPage /></StudentRoute>} />
          
          {/* Protected routes with subscription check */}
          <Route 
            path="/chapters" 
            element={
              <StudentRoute>
                <SubscriptionGuard>
                  <ChapterListPage />
                </SubscriptionGuard>
              </StudentRoute>
            } 
          />
          <Route 
            path="/tutor" 
            element={
              <StudentRoute>
                <SubscriptionGuard>
                  <TutorChatPage />
                </SubscriptionGuard>
              </StudentRoute>
            } 
          />
          <Route 
            path="/quiz" 
            element={
              <StudentRoute>
                <SubscriptionGuard>
                  <QuizPage />
                </SubscriptionGuard>
              </StudentRoute>
            } 
          />
          
          <Route path="/parent" element={<StudentRoute><ParentDashboardPage /></StudentRoute>} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/admin/upload" element={<AdminRoute><AdminUploadPage /></AdminRoute>} />
        </Routes>
      </Layout>
    </Router>
  );
}
