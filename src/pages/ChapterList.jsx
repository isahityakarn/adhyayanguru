import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, Lock, Play } from "lucide-react";
import { Card, PrimaryButton, Bar } from "../components/UI";
import { c, headingFont } from "../utils/theme";
import { get } from "../utils/api";

function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("studyyodha_user") || "null");
  } catch {
    return null;
  }
}

function getSubjectValue(subject, fallback) {
  return subject?.id ?? subject?.subject_id ?? fallback;
}

function getSubjectName(subject) {
  return subject?.name ?? subject?.title ?? subject?.subject_name ?? "Subject";
}

function getSubjectStatus(subject) {
  const status = String(subject?.status || "progress").toLowerCase();
  if (["done", "completed", "complete"].includes(status)) return "done";
  if (["locked", "lock"].includes(status)) return "locked";
  return "progress";
}

export default function ChapterListPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const classId = user?.class_id ?? user?.classLevel;
  const boardId = user?.board_id ?? user?.board;
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      if (!classId || !boardId) {
        setError("Class and board details are missing from your profile.");
        setLoading(false);
        return;
      }

      try {
        const response = await get(`/subjects?class_id=${encodeURIComponent(classId)}&board_id=${encodeURIComponent(boardId)}`);
        if (active) setSubjects(getItems(response));
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubjects();
    return () => { active = false; };
  }, [classId, boardId]);
  
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
          {user?.class_name || user?.classLevel || "Class"} · {user?.board_name || user?.board || "Board"}
        </div>
        <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
          Chapters
        </h1>
      </div>

      {/* Chapters List */}
      <div className="space-y-4">
        {loading && <p className="text-sm" style={{ color: c.gray }}>Loading subjects...</p>}
        {!loading && error && <p className="text-sm" style={{ color: c.error }}>{error}</p>}
        {!loading && !error && subjects.length === 0 && (
          <p className="text-sm" style={{ color: c.gray }}>No subjects found for your class and board.</p>
        )}
        {!loading && !error && subjects.map((subject, index) => {
          const ch = {
            idx: getSubjectValue(subject, index + 1),
            title: getSubjectName(subject),
            meta: subject?.meta || subject?.description || "Available subject",
            status: getSubjectStatus(subject),
            pct: Number(subject?.progress ?? subject?.pct ?? 0),
          };
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
