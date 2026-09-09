import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  FolderOpen
} from "lucide-react";
import { Card, PrimaryButton, Bar } from "../../components/UI";
import { c, headingFont } from "../../utils/theme";
import { get, post } from "../../utils/api";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("studyyodha_user") || "null");
  } catch {
    return null;
  }
}

function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.subjects)) return response.subjects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

export default function ChapterListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectIdParam = searchParams.get("subject_id");

  const user = getStoredUser();
  const studentProfile = user?.student_profile;
  const classId = studentProfile?.class?.id ?? user?.class_id;
  const boardId = studentProfile?.board?.id ?? user?.board_id;

  // Subjects & Selection State
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Chapters State for Selected Subject
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch Subjects on mount
  useEffect(() => {
    loadSubjects();
  }, [classId, boardId]);

  // 2. Fetch Chapters when selectedSubject changes or subjectIdParam is present
  useEffect(() => {
    if (selectedSubject) {
      loadChaptersForSubject(selectedSubject.id);
    }
  }, [selectedSubject]);

  async function loadSubjects() {
    setSubjectsLoading(true);
    setErrorMsg("");
    try {
      let endpoint = "/subjects";
      if (classId && boardId && isFinite(classId) && isFinite(boardId)) {
        endpoint = `/subjects?class_id=${encodeURIComponent(classId)}&board_id=${encodeURIComponent(boardId)}`;
      } else if (classId && isFinite(classId)) {
        endpoint = `/subjects?class_id=${encodeURIComponent(classId)}`;
      }

      let response = await get(endpoint);
      let items = getItems(response);

      if (items.length === 0 && (classId || boardId)) {
        response = await get("/subjects");
        items = getItems(response);
      }

      setSubjects(items);

      // If URL parameter contains subject_id, pre-select that subject
      if (subjectIdParam) {
        const found = items.find((s) => String(s.id) === String(subjectIdParam));
        if (found) {
          setSelectedSubject(found);
        }
      }
    } catch (err) {
      console.error("Failed to load subjects:", err);
      setErrorMsg(err.message || "Failed to load subjects");
    } finally {
      setSubjectsLoading(false);
    }
  }

  async function loadChaptersForSubject(subjectId) {
    setChaptersLoading(true);
    setErrorMsg("");
    try {
      const response = await get(`/chapters?subject_id=${subjectId}`);
      const list = response.chapters || response || [];
      setChapters(list);
    } catch (err) {
      console.error("Failed to fetch chapters for subject:", err);
      setErrorMsg("Failed to load chapters for this subject.");
    } finally {
      setChaptersLoading(false);
    }
  }

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setSearchParams({ subject_id: subject.id });
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSearchParams({});
    setChapters([]);
  };

  const handleToggleChapterCompletion = async (chapterId, currentIsCompleted) => {
    try {
      const newStatus = currentIsCompleted ? "in_progress" : "completed";
      const newPct = currentIsCompleted ? 0 : 100;

      await post("/progress/update", {
        chapter_id: chapterId,
        status: newStatus,
        percent_complete: newPct,
      });
    } catch (err) {
      console.error("Failed to update chapter completion:", err);
      alert("Failed to update chapter status.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      {/* Header & Navigation Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: c.primary }}>
            <span>{studentProfile?.class?.name || user?.class_name || "Class"}</span>
            <span>·</span>
            <span>{studentProfile?.board?.name || user?.board_name || "Board"}</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedSubject && (
              <button
                onClick={handleBackToSubjects}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Back to Subjects"
              >
                <ArrowLeft size={22} />
              </button>
            )}
            <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
              {selectedSubject ? `${selectedSubject.name} Chapters` : "Select a Subject"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedSubject && (
            <button
              onClick={handleBackToSubjects}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-xs"
            >
              <ArrowLeft size={14} /> All Subjects
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* ----------------- STEP 1: SUBJECTS LIST VIEW ----------------- */}
      {!selectedSubject && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-6">
            Choose a subject to view its chapter list:
          </p>

          {subjectsLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">Loading subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="dashboard-card text-center py-12">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-800" style={{ ...headingFont }}>
                No Subjects Available
              </h3>
              <p className="text-sm text-gray-500">Please check back later or select a class.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className="dashboard-card cursor-pointer border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <BookOpen size={24} />
                      </div>
                      <span className="app-badge app-badge-info text-[11px] font-bold uppercase">
                        Subject
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug group-hover:text-amber-600 transition-colors" style={{ ...headingFont }}>
                      {subject.name}
                    </h2>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-6">
                      {subject.description || `Explore interactive lessons and AI tutor assistance for ${subject.name}.`}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleSelectSubject(subject)}
                      className="w-full py-2.5 px-4 text-xs font-extrabold rounded-xl text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow-md hover:opacity-95"
                      style={{ background: c.primary }}
                    >
                      <span>Explore Chapters</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- STEP 2: CHAPTERS LIST FOR SELECTED SUBJECT ----------------- */}
      {selectedSubject && (
        <div className="space-y-6">
          {/* Quick Subject Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-gray-500 mr-1 flex-shrink-0">Switch Subject:</span>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSubject(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${
                  selectedSubject.id === s.id
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {chaptersLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">Loading chapters for {selectedSubject.name}...</p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="dashboard-card text-center py-12">
              <FolderOpen size={40} className="mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-800" style={{ ...headingFont }}>
                No Chapters Found
              </h3>
              <p className="text-sm text-gray-500">There are no chapters uploaded yet for {selectedSubject.name}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chapters.map((ch) => {
                // Check if chapter has progress data
                const isCompleted = ch.progress?.status === "completed";

                return (
                  <Card key={ch.id} className="border border-gray-200 hover:border-amber-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                          Ch {ch.chapter_number || 1}
                        </div>
                        <div>
                          {isCompleted ? (
                            <span className="app-badge app-badge-success text-[10px] uppercase font-bold flex items-center gap-1">
                              <CheckCircle size={12} /> Completed
                            </span>
                          ) : (
                            <span className="app-badge app-badge-warning text-[10px] uppercase font-bold flex items-center gap-1">
                              <Clock size={12} /> In Progress
                            </span>
                          )}
                        </div>
                      </div>

                      <h2 className="text-lg font-bold mb-1 text-gray-900 leading-snug" style={{ ...headingFont }}>
                        {ch.title}
                      </h2>
                      <p className="text-xs font-semibold text-gray-500 mb-4">{selectedSubject.name}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/tutor?chapter_id=${ch.id}`)}
                          className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                        >
                          <BookOpen size={14} /> Study Chapter
                        </button>

                        <button
                          onClick={() => handleToggleChapterCompletion(ch.id, isCompleted)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                            isCompleted
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={isCompleted ? "Mark Incomplete" : "Mark Complete"}
                        >
                          {isCompleted ? (
                            <>
                              <XCircle size={14} /> Incomplete
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} /> Complete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
