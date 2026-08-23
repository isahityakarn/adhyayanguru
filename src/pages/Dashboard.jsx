import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, TrendingUp, BookOpen, MessageCircle, Award, Flame, AlertCircle, Sparkles, Zap, Crown, RefreshCw } from "lucide-react";
import { Card, Bar, PrimaryButton } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";
import { get } from "../utils/api";

const getSubjectIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("math")) return "📐";
  if (n.includes("sci") || n.includes("chem") || n.includes("phys") || n.includes("bio")) return "🔬";
  if (n.includes("social") || n.includes("history") || n.includes("geo")) return "🌍";
  if (n.includes("eng") || n.includes("hind") || n.includes("lang")) return "📖";
  return "📚";
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = JSON.parse(localStorage.getItem("studyyodha_user") || "null");

  const [user, setUser] = useState(storedUser);
  const [userPlan, setUserPlan] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [redirectMessage, setRedirectMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressSummary, setProgressSummary] = useState(null);
  const [recentChapter, setRecentChapter] = useState(null);
  const [subjectList, setSubjectList] = useState([]);

  const userName = user?.name || storedUser?.name || "Student";
  const userClass = user?.student_profile?.class?.name || storedUser?.classLevel || "Class 10";
  const userBoard = user?.student_profile?.board?.name || storedUser?.board || "CBSE";

  useEffect(() => {
    loadDashboardData();

    if (location.state?.subscriptionExpired && location.state?.message) {
      setRedirectMessage(location.state.message);
      setTimeout(() => {
        setRedirectMessage(null);
      }, 10000);
    }
  }, [location]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch User Data
      const userRes = await get("/user");
      const userData = userRes?.user;
      if (userData) {
        setUser(userData);
      }

      // Process subscription details
      const subscription = userData?.subscription;
      let effectivePlan = "free";
      let planDetails = null;
      let isSubscriptionActive = false;

      if (subscription && subscription.plan) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();

        if (endDate > today) {
          isSubscriptionActive = true;
          planDetails = subscription.plan;
          effectivePlan = subscription.plan.duration_days >= 30 ? "basic" : "free";
        } else {
          setUserPlan({
            name: "free",
            displayName: "Free",
            expired: true,
            expiredPlan: subscription.plan.name
          });
        }
      }

      if (isSubscriptionActive && planDetails) {
        setUserPlan({
          name: effectivePlan,
          displayName: planDetails.name,
          price: planDetails.price_inr,
          duration: planDetails.duration_days,
          features: planDetails.features,
          isActive: true,
          endDate: subscription.end_date
        });
      } else if (!userPlan?.expired) {
        setUserPlan({
          name: "free",
          displayName: "Free Plan",
          isActive: false
        });
      }

      let remainingDays = 0;
      if (subscription && subscription.end_date) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const diffTime = endDate - today;
        remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      setDaysRemaining(remainingDays);

      // 2. Fetch Progress Summary & Recent Chapter
      let progressData = null;
      try {
        try {
          progressData = await get("/progress/parent-report");
        } catch (e1) {
          try {
            progressData = await get("/progress/summary");
          } catch (e2) {
            // progress API not deployed on remote backend yet
          }
        }
        if (progressData) {
          setProgressSummary(progressData);
          if (progressData.chapters && progressData.chapters.length > 0) {
            setRecentChapter(progressData.chapters[0]); // sorted by last_accessed_at desc
          }
        }
      } catch (err) {
        console.error("Failed to fetch progress summary:", err);
      }

      // 3. Fetch Subjects & calculate real dynamic progress per subject
      try {
        const subRes = await get("/subjects");
        const rawSubjects = subRes?.subjects || subRes?.data || (Array.isArray(subRes) ? subRes : []);

        const userChapters = progressData?.chapters || [];

        const processedSubjects = rawSubjects.map((sub, idx) => {
          const subChapters = userChapters.filter(
            (ch) => ch.subject_name?.toLowerCase() === sub.name?.toLowerCase()
          );

          let pct = 0;
          if (subChapters.length > 0) {
            const sumPct = subChapters.reduce((acc, c) => acc + (c.percent_complete || 0), 0);
            pct = Math.round(sumPct / subChapters.length);
          }

          const colors = [c.primary, c.accent, c.secondary, c.info];

          return {
            id: sub.id,
            name: sub.name,
            pct: pct,
            color: colors[idx % colors.length],
            icon: getSubjectIcon(sub.name),
            chaptersCount: subChapters.length,
          };
        });

        setSubjectList(processedSubjects);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate dynamic stats
  const summary = progressSummary?.summary || {};
  const totalChapters = progressSummary?.chapters || [];

  const avgCompletionPct = totalChapters.length > 0
    ? Math.round(totalChapters.reduce((acc, ch) => acc + (ch.percent_complete || 0), 0) / totalChapters.length)
    : 0;

  const stats = [
    {
      icon: Clock,
      num: summary.formatted_total_time_spent || "0s",
      lbl: "Total Time Studied",
      color: c.primary,
    },
    {
      icon: TrendingUp,
      num: `${avgCompletionPct}%`,
      lbl: "Avg Completion Rate",
      color: c.accent,
    },
    {
      icon: BookOpen,
      num: String(summary.total_chapters_completed || 0),
      lbl: "Chapters Completed",
      color: "#059669",
    },
    {
      icon: MessageCircle,
      num: String(summary.total_chapters_started || 0),
      lbl: "Active Chapters",
      color: c.info,
    },
  ];

  return (
    <div>
      {/* Redirect Message from Protected Route */}
      {redirectMessage && (
        <Card
          className="mb-6"
          style={{
            background: `linear-gradient(135deg, ${c.error}15 0%, ${c.error}05 100%)`,
            border: `2px solid ${c.error}`,
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: c.error, color: c.white }}
            >
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold mb-1" style={{ color: c.error }}>
                Access Denied
              </div>
              <div className="text-sm" style={{ color: c.gray }}>
                {redirectMessage}
              </div>
            </div>
            <button
              onClick={() => setRedirectMessage(null)}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                color: c.gray,
                cursor: "pointer",
                fontSize: "20px",
              }}
            >
              ×
            </button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3" style={{ ...headingFont, color: c.dark }}>
            Welcome back, {userName}! 👋
            {loading && <RefreshCw size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            {userClass} · {userBoard} · {userPlan?.displayName || "Free Plan"} · Ready to continue learning?
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.secondaryDark} 100%)` }}
        >
          <Flame size={20} color={c.white} />
          <div>
            <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {userPlan?.isActive ? "Plan Expires In" : "Free Plan"}
            </div>
            <div className="text-lg font-bold" style={{ color: c.white }}>
              {userPlan?.isActive ? `${daysRemaining} days` : "∞"}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Info Banner (if applicable) */}
      {userPlan?.isActive && userPlan.name !== "free" && (
        <Card
          className="mb-6"
          style={{ background: `linear-gradient(135deg, ${c.accent}15 0%, ${c.accent}05 100%)`, border: `1px solid ${c.accent}40` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.accent, color: c.white }}>
                <Award size={20} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: c.dark }}>
                  {userPlan.displayName} Active
                </div>
                <div className="text-xs" style={{ color: c.gray }}>
                  {userPlan.duration} days plan • Expires: {new Date(userPlan.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: c.accent }}>
                ₹{userPlan.price}
              </div>
              <div className="text-xs" style={{ color: c.gray }}>
                {userPlan.duration} days
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Expired Subscription Warning */}
      {userPlan?.expired && (
        <Card
          className="mb-6"
          style={{ background: `linear-gradient(135deg, ${c.error}15 0%, ${c.error}05 100%)`, border: `1px solid ${c.error}40` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.error, color: c.white }}>
                <Award size={20} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: c.error }}>
                  {userPlan.expiredPlan} Subscription Expired
                </div>
                <div className="text-xs" style={{ color: c.gray }}>
                  Your premium features are now limited. Renew to continue enjoying full access.
                </div>
              </div>
            </div>
            <PrimaryButton className="text-xs" onClick={() => navigate("/plans")}>
              Renew Now
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* Modern Update Plan Section - Shows when days remaining is 0 */}
      {daysRemaining === 0 && !userPlan?.isActive && (
        <div
          className="mb-8"
          style={{
            position: "relative",
            borderRadius: "20px",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 50%, ${c.accent} 100%)`,
            boxShadow: `0 20px 60px -15px ${c.primary}60`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              animation: "pulse 3s ease-in-out infinite",
            }}
          />

          <div style={{ position: "relative", padding: "40px 32px" }}>
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Sparkles size={16} color={c.white} />
                <span className="text-xs font-bold" style={{ color: c.white }}>
                  YOUR PLAN HAS EXPIRED
                </span>
                <Sparkles size={16} color={c.white} />
              </div>

              <h2
                className="text-3xl md:text-4xl font-bold mb-3"
                style={{
                  ...displayFont,
                  color: c.white,
                  textShadow: "0 2px 20px rgba(0,0,0,0.2)",
                }}
              >
                Unlock Your Full Potential
              </h2>

              <p
                className="text-base md:text-lg mb-6"
                style={{
                  color: "rgba(255,255,255,0.95)",
                  maxWidth: "600px",
                  margin: "0 auto",
                }}
              >
                Get unlimited access to all subjects, AI tutor, quizzes, and premium content
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: Crown, title: "Premium Content", desc: "Access all subjects & chapters" },
                { icon: Zap, title: "AI Tutor 24/7", desc: "Get instant help anytime" },
                { icon: Award, title: "Track Progress", desc: "Detailed analytics & reports" },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    padding: "20px",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <feature.icon size={24} color={c.white} className="mb-3" />
                  <div className="text-sm font-bold mb-1" style={{ color: c.white }}>
                    {feature.title}
                  </div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {feature.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate("/plans")}
                style={{
                  background: c.white,
                  color: c.primary,
                  padding: "16px 48px",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "18px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  ...headingFont,
                }}
              >
                <Crown size={24} />
                Update Your Plan Now
                <Sparkles size={20} />
              </button>

              <div className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Choose from flexible plans starting at ₹99/month
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.lbl}>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}20` }}
                >
                  <Icon size={20} color={s.color} />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
                {s.num}
              </div>
              <div className="text-xs font-medium" style={{ color: c.gray }}>
                {s.lbl}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Dynamic Continue Learning Card */}
      <Card className="mb-8 p-0 overflow-hidden">
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 100%)` }}>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                Continue Learning
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ ...headingFont, color: c.white }}>
                {recentChapter
                  ? `${recentChapter.chapter_title} ${recentChapter.chapter_number ? `— Chapter ${recentChapter.chapter_number}` : ""}`
                  : "Explore AI Tutor & Chapters"}
              </h3>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>
                {recentChapter
                  ? `${recentChapter.subject_name} · ${recentChapter.percent_complete || 0}% complete (${recentChapter.formatted_time_spent || "0s"} studied)`
                  : "Select a chapter to begin AI tutor interactive study session"}
              </p>
              <PrimaryButton
                variant="secondary"
                onClick={() => {
                  if (recentChapter) {
                    navigate(`/tutor?subject_id=${recentChapter.subject_id || ""}`);
                  } else {
                    navigate("/tutor");
                  }
                }}
              >
                {recentChapter ? "Resume Learning →" : "Start Learning →"}
              </PrimaryButton>
            </div>
            <div className="hidden md:block text-6xl opacity-20">
              {getSubjectIcon(recentChapter?.subject_name)}
            </div>
          </div>
        </div>
        <div className="h-2" style={{ background: c.lighterGray }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${recentChapter ? recentChapter.percent_complete || 5 : 0}%`, background: c.secondary }}
          ></div>
        </div>
      </Card>

      {/* Dynamic Subjects List */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
            Your Subjects
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {subjectList.length} subjects available
          </span>
        </div>

        {loading && subjectList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Loading subjects & course progress...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {subjectList.map((s) => (
              <Card
                key={s.id || s.name}
                hover
                onClick={() => navigate(`/tutor?subject_id=${s.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{s.icon}</div>
                  <div className="flex-1">
                    <div className="text-base font-bold mb-1" style={{ color: c.dark }}>
                      {s.name}
                    </div>
                    <div className="text-xs" style={{ color: c.gray }}>
                      {s.pct}% completed
                    </div>
                  </div>
                  <Award size={20} color={s.color} />
                </div>
                <Bar pct={s.pct} color={s.color} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
