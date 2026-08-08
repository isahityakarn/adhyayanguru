import { TrendingUp, AlertCircle, Award, Calendar } from "lucide-react";
import { Card, Bar } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function ParentDashboardPage() {
  const stats = [
    { icon: Calendar, num: "4.5h", lbl: "Study time this week", color: c.primary },
    { icon: TrendingUp, num: "82%", lbl: "Average score", color: c.accent },
    { icon: Award, num: "3", lbl: "Subjects active", color: c.secondary },
    { icon: Award, num: "7", lbl: "Day streak", color: c.info },
  ];
  
  const subjects = [
    { name: "Mathematics", score: 85, color: c.primary },
    { name: "Science", score: 78, color: c.accent },
    { name: "Social Science", score: 92, color: c.secondary },
  ];
  
  const weak = [
    { topic: "Trigonometric identities", tag: "Mathematics", color: c.primary },
    { topic: "Chemical equations", tag: "Science", color: c.accent },
    { topic: "Map reading", tag: "Social Science", color: c.secondary },
  ];
  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-semibold mb-2" style={{ color: c.primary }}>
            Parent Dashboard
          </div>
          <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
            Aarav's Progress
          </h1>
        </div>
        <div className="px-4 py-2 rounded-lg" style={{ background: c.primaryBg }}>
          <div className="text-xs font-semibold" style={{ color: c.gray }}>Student</div>
          <div className="text-sm font-bold" style={{ color: c.primaryDark }}>Class 10 · CBSE</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.lbl}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${s.color}20` }}>
                <Icon size={20} color={s.color} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <h2 className="text-lg font-bold mb-5" style={{ ...headingFont, color: c.dark }}>
            Subject Performance
          </h2>
          <div className="space-y-4">
            {subjects.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: c.dark }}>{s.name}</span>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.score}%</span>
                </div>
                <Bar pct={s.score} color={s.color} />
              </div>
            ))}
          </div>
        </Card>

        {/* Topics Needing Attention */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle size={20} color={c.secondary} />
            <h2 className="text-lg font-bold" style={{ ...headingFont, color: c.dark }}>
              Needs Attention
            </h2>
          </div>
          <div className="space-y-3">
            {weak.map((w) => (
              <div key={w.topic} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: c.lighterGray }}>
                <span className="text-sm font-semibold" style={{ color: c.dark }}>{w.topic}</span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold" 
                  style={{ background: `${w.color}20`, color: w.color }}>
                  {w.tag}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
