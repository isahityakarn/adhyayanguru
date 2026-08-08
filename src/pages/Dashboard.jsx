import { useNavigate } from "react-router-dom";
import { Clock, TrendingUp, BookOpen, MessageCircle, Award, Flame } from "lucide-react";
import { Card, Bar, PrimaryButton } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";

export default function DashboardPage() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("studyyodha_user") || "null");
  const userName = storedUser?.name || "Student";
  const userClass = storedUser?.classLevel || "Class 10";
  const userBoard = storedUser?.board || "CBSE";
  
  const stats = [
    { icon: Clock, num: "4.5h", lbl: "Studied this week", color: c.primary },
    { icon: TrendingUp, num: "82%", lbl: "Avg quiz score", color: c.accent },
    { icon: BookOpen, num: "12", lbl: "Chapters completed", color: c.secondary },
    { icon: MessageCircle, num: "3", lbl: "Doubts this week", color: c.info },
  ];
  
  const subjects = [
    { name: "Mathematics", pct: 60, color: c.primary, icon: "📐" },
    { name: "Science", pct: 40, color: c.accent, icon: "🔬" },
    { name: "Social Science", pct: 75, color: c.secondary, icon: "🌍" },
  ];
  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            {userClass} · {userBoard} · Ready to continue learning?
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" 
          style={{ background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.secondaryDark} 100%)` }}>
          <Flame size={20} color={c.white} />
          <div>
            <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>Streak</div>
            <div className="text-lg font-bold" style={{ color: c.white }}>7 days</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.lbl}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}20` }}>
                  <Icon size={20} color={s.color} />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
                {s.num}
              </div>
              <div className="text-xs" style={{ color: c.gray }}>
                {s.lbl}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Continue Learning Card */}
      <Card className="mb-8 p-0 overflow-hidden">
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 100%)` }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Continue Learning
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ ...headingFont, color: c.white }}>
                Trigonometry — Chapter 8
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Mathematics · 60% complete
              </p>
              <PrimaryButton variant="secondary" onClick={() => navigate("/chapters")}>
                Resume Learning →
              </PrimaryButton>
            </div>
            <div className="hidden md:block text-6xl opacity-20">📐</div>
          </div>
        </div>
        <div className="h-2" style={{ background: c.lighterGray }}>
          <div className="h-full" style={{ width: '60%', background: c.secondary }}></div>
        </div>
      </Card>

      {/* Subjects */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-5" style={{ ...headingFont, color: c.dark }}>
          Your Subjects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {subjects.map((s) => (
            <Card key={s.name} hover onClick={() => navigate("/chapters")}>
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
      </div>
    </div>
  );
}
