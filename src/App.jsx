import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chapters" element={<ChapterListPage />} />
          <Route path="/tutor" element={<TutorChatPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/parent" element={<ParentDashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
