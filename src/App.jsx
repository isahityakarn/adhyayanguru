import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ChapterListPage from "./pages/ChapterList";
import TutorChatPage from "./pages/TutorChat";
import QuizPage from "./pages/Quiz";
import ParentDashboardPage from "./pages/ParentDashboard";
import AdminPage from "./pages/Admin";
import "./App.css";

function AdminRoute() {
  return localStorage.getItem("studyyodha_user_role") === "admin"
    ? <AdminPage />
    : <Navigate to="/" replace />;
}

function StudentRoute({ children }) {
  return localStorage.getItem("studyyodha_user_role") === "student"
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
          <Route path="/chapters" element={<StudentRoute><ChapterListPage /></StudentRoute>} />
          <Route path="/tutor" element={<StudentRoute><TutorChatPage /></StudentRoute>} />
          <Route path="/quiz" element={<StudentRoute><QuizPage /></StudentRoute>} />
          <Route path="/parent" element={<StudentRoute><ParentDashboardPage /></StudentRoute>} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </Layout>
    </Router>
  );
}
