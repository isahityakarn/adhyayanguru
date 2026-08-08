import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, Lock, Play } from "lucide-react";
import { Card, PrimaryButton, Bar } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function ChapterListPage() {
  const navigate = useNavigate();
  
  const chapters = [
    { idx: 1, title: "Real numbers", meta: "12 topics · 3 practice tests", status: "done", pct: 100 },
    { idx: 2, title: "Polynomials", meta: "9 topics · 2 practice tests", status: "done", pct: 100 },
    { idx: 8, title: "Introduction to trigonometry", meta: "14 topics · 4 practice tests", status: "progress", pct: 60 },
    { idx: 9, title: "Circles", meta: "7 topics · 2 practice tests", status: "locked", pct: 0 },
  ];
  
  const statusConfig = { 
    done: { label: "Completed", icon: CheckCircle, color: c.accent },
    progress: { label: "In Progress", icon: Clock, color: c.secondary },
    locked: { label: "Locked", icon: Lock, color: c.gray }
  };
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm font-semibold mb-2" style={{ color: c.primary }}>
          Mathematics · Class 10 · CBSE
        </div>
        <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
          Chapters
        </h1>
      </div>

      {/* Chapters List */}
      <div className="space-y-4">
        {chapters.map((ch) => {
          const config = statusConfig[ch.status];
          const Icon = config.icon;
          const isLocked = ch.status === "locked";
          
          return (
            <Card 
              key={ch.idx}
              hover={!isLocked}
              className={isLocked ? 'opacity-60' : ''}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Chapter Number */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ 
                      background: isLocked ? c.lighterGray : `${config.color}20`,
                      color: config.color
                    }}
                  >
                    {ch.idx}
                  </div>
                  
                  {/* Chapter Info */}
                  <div className="flex-1">
                    <div className="text-base font-bold mb-1" style={{ color: c.dark }}>
                      {ch.title}
                    </div>
                    <div className="text-xs mb-2" style={{ color: c.gray }}>
                      {ch.meta}
                    </div>
                    {ch.pct > 0 && ch.pct < 100 && (
                      <Bar pct={ch.pct} color={config.color} />
                    )}
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Icon size={18} color={config.color} />
                    <span className="text-sm font-semibold" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </div>
                  
                  {!isLocked && (
                    <PrimaryButton 
                      onClick={() => navigate("/tutor")}
                      variant={ch.status === "progress" ? "primary" : "outline"}
                    >
                      {ch.status === "progress" ? <><Play size={14} /> Continue</> : "Start"}
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
