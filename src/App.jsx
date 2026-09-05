import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/student/Dashboard";
import ChapterListPage from "./pages/student/ChapterList";
import TutorChatPage from "./pages/student/TutorChat";
import QuizPage from "./pages/student/Quiz";
import QuizHistoryPage from "./pages/student/QuizHistory";
import AdminQuizManagementPage from "./pages/admin/AdminQuizManagement";
import ParentDashboardPage from "./pages/ParentDashboard";
import PlansPage from "./pages/student/Plans";
import AdminPage from "./pages/admin/Admin";

import SubscriptionGuard from "./utils/SubscriptionGuard";
import "./App.css";

function AdminRoute({ children }) {
  const role = localStorage.getItem("studyyodha_user_role");
  const isAdmin = role === "admin";
  if (!isAdmin) return <Navigate to="/login" replace />;
  return children || <AdminPage />;
}

function StudentRoute({ children }) {
  const token = localStorage.getItem("studyyodha_token");
  const isAuthenticated = Boolean(token);
  return isAuthenticated
    ? children
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/quizzes" element={<AdminRoute><AdminQuizManagementPage /></AdminRoute>} />
        <Route path="/admin/*" element={<AdminRoute />} />

        <Route element={<Layout />}>
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
          
          <Route 
            path="/quiz-history" 
            element={
              <StudentRoute>
                <SubscriptionGuard>
                  <QuizHistoryPage />
                </SubscriptionGuard>
              </StudentRoute>
            } 
          />
          
          <Route path="/parent" element={<StudentRoute><ParentDashboardPage /></StudentRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}
