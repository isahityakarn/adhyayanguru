import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle, Clock, Lock, Play } from "lucide-react";
import { Card, PrimaryButton, Bar } from "../components/UI";
import { c, headingFont } from "../utils/theme";
import { get } from "../utils/api";

function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.subjects)) return response.subjects;
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
  const studentProfile = user?.student_profile;
  const classId = studentProfile?.class?.id ?? user?.class_id;
  const boardId = studentProfile?.board?.id ?? user?.board_id;
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
          {studentProfile?.class?.name || user?.class_name || user?.classLevel || "Class"} · {studentProfile?.board?.name || user?.board_name || user?.board || "Board"}
        </div>
        <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
          Chapters
        </h1>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading && <p className="text-sm" style={{ color: c.gray }}>Loading subjects...</p>}
        {!loading && error && <p className="text-sm" style={{ color: c.error }}>{error}</p>}
        {!loading && !error && subjects.length === 0 && (
          <p className="text-sm" style={{ color: c.gray }}>No subjects found for your class and board.</p>
        )}
        {!loading && !error && subjects.map((subject, index) => {
          const ch = {
            idx: getSubjectValue(subject, index + 1),
            title: getSubjectName(subject),
            meta: subject?.meta || subject?.description || `${studentProfile?.class?.name || "Your class"} · ${studentProfile?.board?.name || "Your board"}`,
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
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${config.color}20`, color: config.color }}>
                  <BookOpen size={23} />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: config.color }}>
                  <Icon size={16} />
                  {config.label}
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: c.dark }}>{ch.title}</h2>
              <p className="text-sm mb-5" style={{ color: c.gray }}>{ch.meta}</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: c.gray }}>Course progress</span>
                <span className="text-xs font-bold" style={{ color: config.color }}>{ch.pct}%</span>
              </div>
              <Bar pct={ch.pct} color={config.color} />
              {!isLocked && (
                <PrimaryButton
                  className="mt-5"
                  onClick={() => navigate(`/tutor?subject_id=${encodeURIComponent(ch.idx)}`)}
                  variant={ch.status === "progress" ? "primary" : "outline"}
                >
                  {ch.status === "progress" ? <><Play size={14} /> Continue</> : <>Open course <ArrowRight size={14} /></>}
                </PrimaryButton>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
