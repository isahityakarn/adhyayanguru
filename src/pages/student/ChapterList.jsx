import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft as ArrowLeftIcon,
  BookOpen as BookOpenIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon,
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  FolderOpen as FolderOpenIcon,
  Sparkles as SparklesIcon,
  Award as AwardIcon,
  Filter as FilterIcon,
  Check,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Play as PlayIcon,
  Trophy as TrophyIcon
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
  const [filterTab, setFilterTab] = useState("all"); // "all" | "in_progress" | "completed"

  // Chapters State for Selected Subject
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [quizStatuses, setQuizStatuses] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch Subjects on mount
  useEffect(() => {
    loadSubjects();
  }, [classId, boardId]);

  // 2. Fetch Chapters when selectedSubject changes
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

      // Check if any items already have is_completed or progress_percent
      // Also fetch progress summary as a supplement to guarantee 100% accurate completion
      let progressChapters = [];
      try {
        let progRes = null;
        try {
          progRes = await get("/progress/parent-report");
        } catch {
          progRes = await get("/progress/summary");
        }
        if (progRes?.chapters) {
          progressChapters = progRes.chapters;
        }
      } catch {
        // Non-fatal if progress API fallback is unavailable
      }

      const mergedSubjects = items.map((sub) => {
        // If subject already has is_completed from backend
        let isCompleted = Boolean(sub.is_completed);
        let completedCount = sub.completed_chapters_count ?? 0;
        let totalCount = sub.chapters_count ?? 0;
        let progressPct = sub.progress_percent ?? 0;

        // Supplement with client progress chapters if available
        if (progressChapters.length > 0) {
          const subProgress = progressChapters.filter(
            (ch) =>
              ch.subject_name?.toLowerCase() === sub.name?.toLowerCase() ||
              String(ch.subject_id) === String(sub.id)
          );

          const clientCompleted = subProgress.filter(
            (c) => c.status === "completed" || c.percent_complete >= 100
          ).length;

          if (clientCompleted > completedCount) {
            completedCount = clientCompleted;
          }

          if (totalCount > 0 && completedCount >= totalCount) {
            isCompleted = true;
            progressPct = 100;
          } else if (totalCount > 0 && progressPct === 0 && completedCount > 0) {
            progressPct = Math.round((completedCount / totalCount) * 100);
          }
        }

        if (totalCount > 0 && completedCount >= totalCount) {
          isCompleted = true;
          progressPct = 100;
        }

        return {
          ...sub,
          chapters_count: totalCount,
          completed_chapters_count: completedCount,
          is_completed: isCompleted,
          progress_percent: progressPct,
        };
      });

      setSubjects(mergedSubjects);

      // If URL parameter contains subject_id, pre-select that subject
      if (subjectIdParam) {
        const found = mergedSubjects.find((s) => String(s.id) === String(subjectIdParam));
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

      // Fetch quiz statuses for all chapters in parallel
      const statusMap = {};
      await Promise.allSettled(
        list.map(async (ch) => {
          try {
            const res = await get(`/chapters/${ch.id}/quiz/status`);
            if (res?.data) {
              statusMap[ch.id] = res.data;
            }
          } catch (e) {
            console.error(`Failed to fetch quiz status for chapter ${ch.id}:`, e);
          }
        })
      );
      setQuizStatuses(statusMap);
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
    const newStatus = currentIsCompleted ? "in_progress" : "completed";
    const newPct = currentIsCompleted ? 0 : 100;

    // 1. Optimistically update local chapters state
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              progress: {
                ...(ch.progress || {}),
                status: newStatus,
                percent_complete: newPct,
              },
            }
          : ch
      )
    );

    // 2. Optimistically update subjects list stats
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSubject?.id) return s;
        const currentCompleted = s.completed_chapters_count || 0;
        const newCompleted = currentIsCompleted
          ? Math.max(0, currentCompleted - 1)
          : currentCompleted + 1;
        const total = s.chapters_count || chapters.length || 1;
        const newProgressPct = total > 0 ? Math.round((newCompleted / total) * 100) : 0;
        const isComp = total > 0 && newCompleted >= total;
        return {
          ...s,
          completed_chapters_count: newCompleted,
          is_completed: isComp,
          progress_percent: newProgressPct,
        };
      })
    );

    try {
      await post("/progress/update", {
        chapter_id: chapterId,
        status: newStatus,
        percent_complete: newPct,
      });

      // Refresh quiz status for this chapter after completion update
      try {
        const res = await get(`/chapters/${chapterId}/quiz/status`);
        if (res?.data) {
          setQuizStatuses((prev) => ({
            ...prev,
            [chapterId]: res.data,
          }));
        }
      } catch (err) {
        console.error("Failed to refresh quiz status:", err);
      }
    } catch (err) {
      console.error("Failed to update chapter completion:", err);
      // Revert optimistic update on failure
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === chapterId
            ? {
                ...ch,
                progress: {
                  ...(ch.progress || {}),
                  status: currentIsCompleted ? "completed" : "in_progress",
                  percent_complete: currentIsCompleted ? 100 : 0,
                },
              }
            : ch
        )
      );
      loadSubjects();
      alert("Failed to update chapter status. Please try again.");
    }
  };

  // Derive stats for currently selected subject
  const currentSubjectInfo =
    subjects.find((s) => s.id === selectedSubject?.id) || selectedSubject;

  const completedInCurrentSubject = chapters.filter(
    (ch) => ch.progress?.status === "completed" || (ch.progress?.percent_complete ?? 0) >= 100
  ).length;

  const isCurrentSubjectCompleted =
    chapters.length > 0 && completedInCurrentSubject === chapters.length;

  // Group subjects into Active vs Completed
  const completedSubjects = subjects.filter(
    (s) => s.is_completed || (s.chapters_count > 0 && s.completed_chapters_count >= s.chapters_count)
  );

  const activeSubjects = subjects.filter(
    (s) => !(s.is_completed || (s.chapters_count > 0 && s.completed_chapters_count >= s.chapters_count))
  );

  const completedSubjectsCount = completedSubjects.length;
  const activeSubjectsCount = activeSubjects.length;

  const renderSubjectCard = (subject) => {
    const isSubjectCompleted =
      subject.is_completed ||
      (subject.chapters_count > 0 &&
        subject.completed_chapters_count >= subject.chapters_count);

    const progressPct = isSubjectCompleted
      ? 100
      : subject.progress_percent ||
        (subject.chapters_count > 0
          ? Math.round(
              ((subject.completed_chapters_count || 0) / subject.chapters_count) * 100
            )
          : 0);

    return (
      <div
        key={subject.id}
        onClick={() => handleSelectSubject(subject)}
        className={`dashboard-card cursor-pointer border transition-all duration-200 group flex flex-col justify-between ${
          isSubjectCompleted
            ? "border-emerald-200 hover:border-emerald-400 hover:shadow-md bg-gradient-to-b from-emerald-50/20 to-transparent"
            : "border-gray-200 hover:border-amber-400 hover:shadow-md"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform ${
                isSubjectCompleted
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <BookOpenIcon size={24} />
            </div>

            {/* Subject Completion Badge */}
            {isSubjectCompleted ? (
              <span className="app-badge app-badge-success text-[11px] font-bold uppercase flex items-center gap-1 shadow-xs">
                <CheckCircleIcon size={12} /> Completed
              </span>
            ) : progressPct > 0 ? (
              <span className="app-badge app-badge-warning text-[11px] font-bold uppercase flex items-center gap-1">
                <ClockIcon size={12} /> In Progress
              </span>
            ) : (
              <span className="app-badge app-badge-info text-[11px] font-bold uppercase">
                Subject
              </span>
            )}
          </div>

          <h2
            className={`text-xl font-bold mb-1 leading-snug transition-colors ${
              isSubjectCompleted
                ? "text-gray-900 group-hover:text-emerald-700"
                : "text-gray-900 group-hover:text-amber-600"
            }`}
            style={{ ...headingFont }}
          >
            {subject.name}
          </h2>
          <p className="text-xs text-gray-500 line-clamp-2 mb-4">
            {subject.description ||
              `Explore interactive lessons and AI tutor assistance for ${subject.name}.`}
          </p>

          {/* Progress Bar & Chapter Counts */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-600">
                {subject.completed_chapters_count || 0} / {subject.chapters_count || 0}{" "}
                Chapters Completed
              </span>
              <span
                className={isSubjectCompleted ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}
              >
                {progressPct}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, progressPct))}%`,
                  backgroundColor: isSubjectCompleted ? "#059669" : c.primary,
                }}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleSelectSubject(subject)}
            className={`w-full py-2.5 px-4 text-xs font-extrabold rounded-xl text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow-md hover:opacity-95 ${
              isSubjectCompleted ? "bg-emerald-600 hover:bg-emerald-700" : ""
            }`}
            style={!isSubjectCompleted ? { background: c.primary } : {}}
          >
            <span>{isSubjectCompleted ? "Review Chapters" : "Explore Chapters"}</span>
            <ChevronRightIcon
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      {/* Header & Navigation Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div
            className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"
            style={{ color: c.primary }}
          >
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
                <ArrowLeftIcon size={22} />
              </button>
            )}
            <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
              {selectedSubject ? `${selectedSubject.name} Chapters` : "Select a Subject"}
            </h1>
            {selectedSubject && isCurrentSubjectCompleted && (
              <span className="app-badge app-badge-success text-xs font-bold flex items-center gap-1 ml-2">
                <CheckCircleIcon size={14} /> Subject Completed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/quiz-history"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <TrophyIcon size={15} className="text-amber-500" />
            <span>My Test History</span>
          </Link>

          {selectedSubject && (
            <button
              onClick={handleBackToSubjects}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-xs"
            >
              <ArrowLeftIcon size={14} /> All Subjects
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
          {/* Header Row with Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <p className="text-sm font-semibold text-gray-500">
              Choose a subject to view chapters and track progress:
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === "all"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({subjects.length})
              </button>

              <button
                onClick={() => setFilterTab("in_progress")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === "in_progress"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Active ({activeSubjectsCount})
              </button>

              <button
                onClick={() => setFilterTab("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  filterTab === "completed"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <CheckCircleIcon size={12} className="text-emerald-600" />
                Completed ({completedSubjectsCount})
              </button>
            </div>
          </div>

          {subjectsLoading ? (
            <div className="text-center py-16">
              <Loader2Icon className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">Loading subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="dashboard-card text-center py-12">
              <BookOpenIcon size={40} className="mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-800" style={{ ...headingFont }}>
                No Subjects Available
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Please check back later or select a class.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* SECTION 1: Active / Ongoing Subjects */}
              {(filterTab === "all" || filterTab === "in_progress") && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <BookOpenIcon size={16} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900" style={{ ...headingFont }}>
                        Active Subjects
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                        {activeSubjects.length}
                      </span>
                    </div>
                  </div>

                  {activeSubjects.length === 0 ? (
                    <div className="dashboard-card text-center py-8 bg-amber-50/30 border border-amber-100">
                      <SparklesIcon size={28} className="mx-auto mb-2 text-amber-500" />
                      <h4 className="text-sm font-bold text-gray-800">All subjects completed!</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        You have completed all available subjects. Great job!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {activeSubjects.map((subject) => renderSubjectCard(subject))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: Completed Subjects (Dedicated visual section) */}
              {(filterTab === "all" || filterTab === "completed") && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-50/50 via-emerald-50/20 to-transparent border border-emerald-200/80 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-emerald-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CheckCircleIcon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-emerald-950" style={{ ...headingFont }}>
                            Completed Subjects
                          </h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                            <Check size={11} /> {completedSubjects.length} Completed
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          All chapters in these subjects are finished. Click any to review.
                        </p>
                      </div>
                    </div>
                  </div>

                  {completedSubjects.length === 0 ? (
                    <div className="dashboard-card text-center py-8 bg-white/70 border border-emerald-100">
                      <AwardIcon size={28} className="mx-auto mb-2 text-emerald-400" />
                      <h4 className="text-sm font-bold text-gray-700">No completed subjects yet</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Finish all chapters in a subject to have it appear in this completed section.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {completedSubjects.map((subject) => renderSubjectCard(subject))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- STEP 2: CHAPTERS LIST FOR SELECTED SUBJECT ----------------- */}
      {selectedSubject && (
        <div className="space-y-6">
          {/* Quick Subject Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-gray-500 mr-1 flex-shrink-0">
              Switch Subject:
            </span>
            {subjects.map((s) => {
              const isComp =
                s.is_completed ||
                (s.chapters_count > 0 && s.completed_chapters_count >= s.chapters_count);
              const isSelected = selectedSubject.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSubject(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 text-white shadow-xs"
                      : isComp
                      ? "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isComp && (
                    <CheckCircleIcon
                      size={13}
                      className={isSelected ? "text-white" : "text-emerald-600"}
                    />
                  )}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Subject Completion Banner */}
          {isCurrentSubjectCompleted && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <AwardIcon size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                    <span>Subject Completed!</span>
                    <SparklesIcon size={14} className="text-amber-500" />
                  </h4>
                  <p className="text-xs text-emerald-700">
                    All {chapters.length} chapters in {selectedSubject.name} have been completed.
                    You can review lessons anytime.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 text-white">
                100% Completed
              </span>
            </div>
          )}

          {chaptersLoading ? (
            <div className="text-center py-16">
              <Loader2Icon className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">
                Loading chapters for {selectedSubject.name}...
              </p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="dashboard-card text-center py-12">
              <FolderOpenIcon size={40} className="mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-800" style={{ ...headingFont }}>
                No Chapters Found
              </h3>
              <p className="text-sm text-gray-500">
                There are no chapters uploaded yet for {selectedSubject.name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chapters.map((ch) => {
                const statusData = quizStatuses[ch.id];
                const isCompleted =
                  ch.progress?.status === "completed" ||
                  (ch.progress?.percent_complete ?? 0) >= 100 ||
                  Boolean(statusData?.chapter_completed);
                const attempts = statusData?.attempts || 0;
                const bestScore = statusData?.best_score || 0;
                const isQuizAvailable = Boolean(statusData?.quiz_available);
                const quiz = statusData?.quiz;

                return (
                  <Card
                    key={ch.id}
                    className={`border transition-all flex flex-col justify-between ${
                      isCompleted
                        ? "border-emerald-200 hover:border-emerald-300 bg-gradient-to-b from-emerald-50/10 to-transparent"
                        : "border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          Ch {ch.chapter_number || 1}
                        </div>
                        <div>
                          {isCompleted ? (
                            <span className="app-badge app-badge-success text-[10px] uppercase font-bold flex items-center gap-1">
                              <CheckCircleIcon size={12} /> Completed
                            </span>
                          ) : (
                            <span className="app-badge app-badge-warning text-[10px] uppercase font-bold flex items-center gap-1">
                              <ClockIcon size={12} /> In Progress
                            </span>
                          )}
                        </div>
                      </div>

                      <h2
                        className="text-lg font-bold mb-1 text-gray-900 leading-snug"
                        style={{ ...headingFont }}
                      >
                        {ch.title}
                      </h2>
                      <p className="text-xs font-semibold text-gray-500 mb-3">
                        {selectedSubject.name}
                      </p>

                      {/* Test / Quiz Status Overview Box */}
                      <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-200 mb-4 space-y-1 text-xs">
                        {!isCompleted ? (
                          <div>
                            <div className="font-extrabold text-amber-800 flex items-center gap-1.5">
                              <LockIcon size={13} className="text-amber-600" />
                              <span>Test Locked</span>
                            </div>
                            <p className="text-gray-500 text-[11px] mt-0.5">
                              Complete this chapter to unlock the practice test & quiz.
                            </p>
                          </div>
                        ) : attempts > 0 ? (
                          <div>
                            <div className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircleIcon size={13} className="text-emerald-600" />
                              <span>Test Completed</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-700 text-[11px] mt-1 pt-1 border-t border-gray-200">
                              <span>
                                Best Score: <strong className="text-emerald-600 font-extrabold">{bestScore}%</strong>
                              </span>
                              <span className="text-gray-500">Attempts: {attempts}</span>
                            </div>
                          </div>
                        ) : isQuizAvailable ? (
                          <div>
                            <div className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                              <UnlockIcon size={13} className="text-emerald-600" />
                              <span>Chapter Test Ready</span>
                            </div>
                            <p className="text-gray-600 text-[11px] font-medium mt-0.5">
                              {quiz?.total_mcq || 50} MCQs + {quiz?.total_written || 20} Written Questions
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold text-amber-700 flex items-center gap-1.5">
                              <Loader2Icon size={13} className="animate-spin text-amber-600" />
                              <span>Preparing Chapter Test...</span>
                            </div>
                            <p className="text-gray-500 text-[11px] mt-0.5">
                              Generating practice questions for this chapter.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/tutor?chapter_id=${ch.id}&subject_id=${selectedSubject?.id || ch.subject_id || ""}`)}
                          className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <BookOpenIcon size={14} /> Study Chapter
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
                              <XCircleIcon size={14} /> Incomplete
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon size={14} /> Complete
                            </>
                          )}
                        </button>
                      </div>

                      {/* Chapter Test Action Button */}
                      {isCompleted && isQuizAvailable ? (
                        attempts > 0 ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/test-results?subject_id=${selectedSubject?.id || ch.subject_id || ""}&chapter_id=${ch.id}`)}
                              className="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <TrophyIcon size={14} /> View Test Result
                            </button>
                            <PrimaryButton
                              onClick={() => navigate(`/quiz?chapter_id=${ch.id}`)}
                              className="py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                              title="Retake Test"
                            >
                              <PlayIcon size={14} /> Retake
                            </PrimaryButton>
                          </div>
                        ) : (
                          <PrimaryButton
                            onClick={() => navigate(`/quiz?chapter_id=${ch.id}`)}
                            className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <PlayIcon size={14} /> Start Chapter Test ({quiz?.total_mcq || 50} MCQ + {quiz?.total_written || 20} Written)
                          </PrimaryButton>
                        )
                      ) : isCompleted && !isQuizAvailable ? (
                        <button
                          onClick={async () => {
                            try {
                              const res = await get(`/chapters/${ch.id}/quiz/status`);
                              if (res?.data) {
                                setQuizStatuses((prev) => ({ ...prev, [ch.id]: res.data }));
                                if (res.data.quiz_available) {
                                  navigate(`/quiz?chapter_id=${ch.id}`);
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="w-full py-2.5 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <PlayIcon size={14} /> Prepare & Start Chapter Test
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <LockIcon size={14} /> Test Locked (Complete Chapter First)
                        </button>
                      )}
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
