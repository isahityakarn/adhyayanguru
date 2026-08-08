import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Pill, Card, PrimaryButton } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";

export default function LandingPage() {
  const navigate = useNavigate();
  
  const subjects = [
    { tag: "Class 9–10", name: "Mathematics", icon: "📐", color: c.primary },
    { tag: "Class 9–10", name: "Science", icon: "🔬", color: c.accent },
    { tag: "Class 6–12", name: "English", icon: "📚", color: c.secondary },
    { tag: "Class 11–12", name: "Accountancy", icon: "💼", color: c.info },
  ];
  
  return (
    <div>
      {/* Hero Section */}
      <div className="rounded-2xl p-10 mb-10 relative overflow-hidden" 
        style={{ 
          background: c.dark,
          boxShadow: '0 20px 40px rgba(24,39,70,0.18)'
        }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20" 
          style={{ background: c.white }}></div>
        <div className="relative z-10">
          <Pill tone="secondary">Class 5–12 · CBSE aligned</Pill>
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-4 leading-tight" 
            style={{ ...headingFont, color: c.white }}>
            Ek teacher, jo har subject padhaye — ghar par, kabhi bhi.
          </h1>
          <p className="text-lg max-w-2xl mb-6 leading-relaxed" 
            style={{ color: 'rgba(255,255,255,0.9)' }}>
            Doubt-solving, practice tests and step-by-step explanations in Hindi and English, built for Class 5 to 12.
          </p>
          <div className="flex gap-4">
            <PrimaryButton onClick={() => navigate("/login")} variant="secondary">
              Start Learning Free →
            </PrimaryButton>
            <PrimaryButton variant="outline"
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: c.white }}>
              See how it works
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Subjects Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
            Subjects covered
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.map((s) => (
            <Card key={s.name} hover>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{s.icon}</div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: s.color }}>
                    {s.tag}
                  </div>
                  <div className="text-base font-bold" style={{ color: c.dark }}>
                    {s.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: c.gray }}>
                <CheckCircle size={14} color={c.accent} />
                <span>Full syllabus coverage</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
