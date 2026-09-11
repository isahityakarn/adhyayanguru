import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Trophy,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  BrainCircuit,
  Eye,
  RotateCcw,
  AlertTriangle,
  Lock,
  Layers,
  BarChart3
} from "lucide-react";
import { PrimaryButton } from "../../components/UI";
import { get } from "../../utils/api";
import { c, headingFont } from "../../utils/theme";

const getSubjectIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("math")) return "📐";
  if (n.includes("sci") || n.includes("chem") || n.includes("phys") || n.includes("bio")) return "🔬";
  if (n.includes("social") || n.includes("history") || n.includes("geo")) return "🌍";
  if (n.includes("eng") || n.includes("hind") || n.includes("lang") || n.includes("हिंदी")) return "📖";
  if (n.includes("khel") || n.includes("sport") || n.includes("yog")) return "🧘";
  if (n.includes("art")) return "🎨";
  return "📚";
};

export default function TestResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initial params
  const initialSubjectId = searchParams.get("subject_id");
  const initialChapterId = searchParams.get("chapter_id");
  const initialAttemptId = searchParams.get("attempt_id");

  // Main data loading state
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // 4-step progressive drill-down view state:
  // "subjects" -> "chapters" -> "marks" -> "result"
  const [viewLevel, setViewLevel] = useState("subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Filter for subjects list
  const [subjectFilterTab, setSubjectFilterTab] = useState("all"); // "all", "in_progress", "passed"
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");

  // Filter for chapters list
  const [chapterSearchQuery, setChapterSearchQuery] = useState("");
  const [chapterStatusFilter, setChapterStatusFilter] = useState("all"); // "all", "passed", "needs_practice", "not_attempted"

  // Level 4: Attempt detail state (for "Result of all")
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState(null);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState(null);
  const [questionTab, setQuestionTab] = useState("all"); // "all", "mcq", "subjective"
  const [mcqFilter, setMcqFilter] = useState("all"); // "all", "correct", "wrong", "unanswered"

  useEffect(() => {
    loadTestResults();
  }, []);

  // Handle direct navigation via URL searchParams
  useEffect(() => {
    if (!data || !data.subjects) return;

    if (initialAttemptId) {
      loadAttemptById(initialAttemptId);
    } else if (initialChapterId) {
      for (const sub of data.subjects) {
        const foundCh = (sub.chapters || []).find(
          (ch) => String(ch.id) === String(initialChapterId)
        );
        if (foundCh) {
          setSelectedSubject(sub);
          setSelectedChapter(foundCh);
          setViewLevel("marks");
          return;
        }
      }
    } else if (initialSubjectId && initialSubjectId !== "all") {
      const foundSub = data.subjects.find(
        (s) => String(s.id) === String(initialSubjectId)
      );
      if (foundSub) {
        setSelectedSubject(foundSub);
        setViewLevel("chapters");
      }
    }
  }, [data, initialSubjectId, initialChapterId, initialAttemptId]);

  async function loadTestResults() {
    setLoading(true);
    setError(null);
    try {
      const res = await get("/student/test-results");
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.message || "Failed to load test results.");
      }
    } catch (err) {
      console.error("Failed to load test results:", err);
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  // Navigation handlers
  function goToSubjects() {
    setViewLevel("subjects");
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedAttemptDetail(null);
    setSubjectSearchQuery("");
    setSubjectFilterTab("all");
    setChapterSearchQuery("");
    setChapterStatusFilter("all");
    const newParams = new URLSearchParams();
    setSearchParams(newParams);
  }

  function goToChapters(sub = selectedSubject) {
    if (!sub) {
      goToSubjects();
      return;
    }
    setViewLevel("chapters");
    setSelectedSubject(sub);
    setSelectedChapter(null);
    setSelectedAttemptDetail(null);
    const newParams = new URLSearchParams();
    newParams.set("subject_id", sub.id);
    setSearchParams(newParams);
  }

  function goToMarks(ch = selectedChapter, sub = selectedSubject) {
    if (!ch) {
      goToChapters(sub);
      return;
    }
    setViewLevel("marks");
    setSelectedChapter(ch);
    if (sub) setSelectedSubject(sub);
    const newParams = new URLSearchParams();
    if (sub) newParams.set("subject_id", sub.id);
    newParams.set("chapter_id", ch.id);
    setSearchParams(newParams);
  }

  async function handleViewAllResults(ch = selectedChapter, sub = selectedSubject) {
    if (!ch) return;
    const targetChapter = ch;
    setSelectedChapter(targetChapter);
    if (sub) setSelectedSubject(sub);
    setViewLevel("result");

    const attemptId = targetChapter.latest_attempt_id;
    if (!attemptId) {
      setResultError("No test attempt found to view results for this chapter.");
      return;
    }

    setResultLoading(true);
    setResultError(null);
    try {
      const res = await get(`/student/test-results/attempt/${attemptId}`);
      if (res && res.success) {
        setSelectedAttemptDetail(res.data);
      } else {
        setResultError(res?.message || "Failed to load test attempt results.");
      }
    } catch (err) {
      console.error("Error loading attempt detail:", err);
      setResultError(err.message || "Failed to load attempt details from the server.");
    } finally {
      setResultLoading(false);
    }
  }

  async function loadAttemptById(attemptId) {
    setViewLevel("result");
    setResultLoading(true);
    setResultError(null);
    try {
      const res = await get(`/student/test-results/attempt/${attemptId}`);
      if (res && res.success) {
        setSelectedAttemptDetail(res.data);
        if (data?.subjects) {
          for (const sub of data.subjects) {
            const ch = (sub.chapters || []).find(
              (c) => String(c.id) === String(res.data.chapter_id)
            );
            if (ch) {
              setSelectedSubject(sub);
              setSelectedChapter(ch);
              break;
            }
          }
        }
      } else {
        setResultError(res?.message || "Failed to load test attempt.");
      }
    } catch (err) {
      console.error("Error loading attempt detail:", err);
      setResultError(err.message || "Failed to load attempt details.");
    } finally {
      setResultLoading(false);
    }
  }

  // Filtered subjects for Level 1 (Subjects view)
  const filteredSubjects = useMemo(() => {
    if (!data?.subjects) return [];
    return data.subjects.filter((sub) => {
      if (subjectSearchQuery) {
        const q = subjectSearchQuery.toLowerCase();
        if (!sub.name?.toLowerCase().includes(q)) return false;
      }
      const hasAttempts = sub.total_attempts > 0;
      const isPassed =
        hasAttempts &&
        sub.passed_chapters_count > 0 &&
        sub.passed_chapters_count >= sub.chapters_attempted;

      if (subjectFilterTab === "passed") return isPassed;
      if (subjectFilterTab === "in_progress") return hasAttempts;
      return true;
    });
  }, [data?.subjects, subjectSearchQuery, subjectFilterTab]);

  // Filtered chapters for Level 2 (Chapters view)
  const filteredChapters = useMemo(() => {
    if (!selectedSubject?.chapters) return [];
    return selectedSubject.chapters.filter((ch) => {
      if (chapterSearchQuery) {
        const q = chapterSearchQuery.toLowerCase();
        const matchTitle = ch.title?.toLowerCase().includes(q);
        const matchNumber = String(ch.chapter_number).includes(q);
        if (!matchTitle && !matchNumber) return false;
      }
      if (chapterStatusFilter === "passed") return ch.status === "passed";
      if (chapterStatusFilter === "needs_practice") return ch.status === "needs_practice";
      if (chapterStatusFilter === "not_attempted") return ch.status === "not_attempted";
      return true;
    });
  }, [selectedSubject, chapterSearchQuery, chapterStatusFilter]);

  const summary = data?.summary || {
    total_tests_attempted: 0,
    passed_tests: 0,
    overall_percentage: 0,
    mcq_overall: { percentage: 0, score: 0 },
    subjective_overall: { percentage: 0, score: 0 },
  };

  const passRate =
    summary.total_tests_attempted > 0
      ? Math.round((summary.passed_tests / summary.total_tests_attempted) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto py-3 px-2">
      {/* Header Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div
            className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"
            style={{ color: c.primary }}
          >
            <Trophy size={14} />
            <span>Academic Performance Record</span>
            <span>·</span>
            <span className="text-gray-500">
              {data?.student?.class || "Class 10"} · {data?.student?.board || "CBSE"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900" style={{ ...headingFont }}>
            Test Performance & Results
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track your progress: select a subject, pick a chapter, check your marks, and view full test results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/chapters"
            id="browse-chapters-btn"
            className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-xs flex items-center gap-1.5 transition-all"
          >
            <BookOpen size={14} /> Practice Tests
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-24">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700" style={{ ...headingFont }}>
            Loading Academic Records...
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Fetching subject scores, chapter marks, and AI tutor evaluations.
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-16 p-6 rounded-3xl border border-red-200 bg-red-50/60 max-w-lg mx-auto">
          <AlertTriangle size={44} className="mx-auto mb-3 text-red-500" />
          <h3 className="text-lg font-bold text-red-800" style={{ ...headingFont }}>
            Failed to Load Results
          </h3>
          <p className="text-xs text-red-600 mb-4">{error}</p>
          <PrimaryButton onClick={loadTestResults} className="text-xs">
            Try Again
          </PrimaryButton>
        </div>
      ) : (
        <>
          {/* Breadcrumb Navigation Trail */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 overflow-x-auto pb-2 mb-6 border-b border-gray-100">
            <button
              onClick={goToSubjects}
              id="breadcrumb-all-subjects"
              className={`hover:text-amber-600 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                viewLevel === "subjects" ? "text-amber-600 font-bold" : "text-gray-600"
              }`}
            >
              <Layers size={13} />
              <span>Subjects</span>
            </button>

            {selectedSubject && (
              <>
                <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => goToChapters(selectedSubject)}
                  id="breadcrumb-selected-subject"
                  className={`hover:text-amber-600 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                    viewLevel === "chapters" ? "text-amber-600 font-bold" : "text-gray-600"
                  }`}
                >
                  <BookOpen size={13} />
                  <span>{selectedSubject.name}</span>
                </button>
              </>
            )}

            {selectedChapter && (
              <>
                <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => goToMarks(selectedChapter, selectedSubject)}
                  id="breadcrumb-selected-chapter-marks"
                  className={`hover:text-amber-600 transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                    viewLevel === "marks" ? "text-amber-600 font-bold" : "text-gray-600"
                  }`}
                >
                  <BarChart3 size={13} />
                  <span>Ch {selectedChapter.chapter_number}: Marks</span>
                </button>
              </>
            )}

            {viewLevel === "result" && (
              <>
                <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-amber-700 font-extrabold flex items-center gap-1.5 flex-shrink-0">
                  <Eye size={13} />
                  <span>Result of All Questions</span>
                </span>
              </>
            )}
          </div>

          {/* ========================================================================= */}
          {/* LEVEL 1: SUBJECTS VIEW                                                   */}
          {/* ========================================================================= */}
          {viewLevel === "subjects" && (
            <div className="space-y-6">
              {/* Overall KPI Performance Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-500">Tests Taken</div>
                    <div className="text-xl font-black text-gray-900" style={{ ...headingFont }}>
                      {summary.total_tests_attempted}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      {passRate}% Pass Rate
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-500">Average Score</div>
                    <div className="text-xl font-black text-gray-900" style={{ ...headingFont }}>
                      {summary.overall_percentage}%
                    </div>
                    <div className="text-[10px] font-semibold text-gray-500">
                      {summary.passed_tests} Tests Passed
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-500">MCQ Average</div>
                    <div className="text-xl font-black text-blue-700" style={{ ...headingFont }}>
                      {summary.mcq_overall?.percentage || 0}%
                    </div>
                    <div className="text-[10px] font-semibold text-gray-500">Objective score</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                    <BrainCircuit size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-500">AI Subjective</div>
                    <div className="text-xl font-black text-indigo-700" style={{ ...headingFont }}>
                      {summary.subjective_overall?.percentage || 0}%
                    </div>
                    <div className="text-[10px] font-semibold text-gray-500">Written evaluation</div>
                  </div>
                </div>
              </div>

              {/* Step 1 Title & Description */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
                    <span>Select a Subject</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {data?.subjects?.length || 0} Subjects
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any subject card below to view chapter tests, marks breakdown, and AI evaluations.
                  </p>
                </div>

                {/* Filter Tabs & Search for Subjects */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={subjectSearchQuery}
                      onChange={(e) => setSubjectSearchQuery(e.target.value)}
                      placeholder="Search subject..."
                      className="w-44 sm:w-56 pl-9 pr-8 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                    {subjectSearchQuery && (
                      <button
                        onClick={() => setSubjectSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setSubjectFilterTab("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        subjectFilterTab === "all"
                          ? "bg-white text-gray-900 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      All ({data?.subjects?.length || 0})
                    </button>
                    <button
                      onClick={() => setSubjectFilterTab("in_progress")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        subjectFilterTab === "in_progress"
                          ? "bg-white text-amber-700 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Tested ({data?.subjects?.filter((s) => s.total_attempts > 0).length || 0})
                    </button>
                    <button
                      onClick={() => setSubjectFilterTab("passed")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        subjectFilterTab === "passed"
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Passed ({data?.subjects?.filter((s) => s.passed_chapters_count > 0).length || 0})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Subject Cards (2 subjects in 1 row: 6 and 6) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSubjects.length === 0 ? (
                  <div className="col-span-full dashboard-card text-center py-12">
                    <BookOpen size={40} className="mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-800" style={{ ...headingFont }}>
                      {data?.subjects?.length === 0 ? "No Subjects Found" : "No Matching Subjects"}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {data?.subjects?.length === 0
                        ? "There are no subjects assigned or available for your class level yet."
                        : "No subjects matched your search or filter criteria. Try resetting filters."}
                    </p>
                    {data?.subjects?.length > 0 ? (
                      <button
                        onClick={() => {
                          setSubjectFilterTab("all");
                          setSubjectSearchQuery("");
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs inline-flex items-center gap-2"
                        style={{ background: c.primary }}
                      >
                        Reset Filters
                      </button>
                    ) : (
                      <Link
                        to="/chapters"
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm inline-flex items-center gap-2"
                        style={{ background: c.primary }}
                      >
                        Browse Chapters <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                ) : (
                  filteredSubjects.map((subject) => {
                    const hasAttempts = subject.total_attempts > 0;
                    const completionRate =
                      subject.total_chapters > 0
                        ? Math.round((subject.chapters_attempted / subject.total_chapters) * 100)
                        : 0;
                    const isSubjectPassed =
                      hasAttempts &&
                      subject.passed_chapters_count > 0 &&
                      subject.passed_chapters_count >= subject.chapters_attempted;

                    return (
                      <div
                        key={subject.id}
                        onClick={() => goToChapters(subject)}
                        id={`subject-card-${subject.id}`}
                        className={`dashboard-card cursor-pointer border transition-all duration-200 group flex flex-col justify-between ${
                          isSubjectPassed
                            ? "border-emerald-200 hover:border-emerald-400 hover:shadow-md bg-gradient-to-b from-emerald-50/20 to-transparent"
                            : "border-gray-200 hover:border-amber-400 hover:shadow-md"
                        }`}
                      >
                        <div>
                          {/* Top Row: Icon + Score Pill */}
                          <div className="flex items-center justify-between mb-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform ${
                                isSubjectPassed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {getSubjectIcon(subject.name)}
                            </div>

                            {/* Status Badge */}
                            {isSubjectPassed ? (
                              <span className="app-badge app-badge-success text-[11px] font-bold uppercase flex items-center gap-1 shadow-xs">
                                <CheckCircle size={12} /> {subject.average_percentage}% Passed
                              </span>
                            ) : hasAttempts ? (
                              <span className="app-badge app-badge-warning text-[11px] font-bold uppercase flex items-center gap-1 shadow-xs">
                                <Clock size={12} /> {subject.average_percentage}% Avg
                              </span>
                            ) : (
                              <span className="app-badge app-badge-info text-[11px] font-bold uppercase">
                                Subject
                              </span>
                            )}
                          </div>

                          {/* Subject Title */}
                          <h2
                            className={`text-xl font-bold mb-1 leading-snug transition-colors ${
                              isSubjectPassed
                                ? "text-gray-900 group-hover:text-emerald-700"
                                : "text-gray-900 group-hover:text-amber-600"
                            }`}
                            style={{ ...headingFont }}
                          >
                            {subject.name}
                          </h2>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                            {subject.class_name ? `${subject.class_name} · ` : ""}
                            {subject.chapters_attempted} of {subject.total_chapters} chapters tested with MCQ and subjective evaluations.
                          </p>

                          {/* Progress Bar & Test Counts */}
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                              <span className="text-gray-600">
                                {subject.chapters_attempted || 0} / {subject.total_chapters || 0} Chapters Tested
                              </span>
                              <span
                                className={
                                  isSubjectPassed
                                    ? "text-emerald-600 font-extrabold"
                                    : "text-amber-600 font-extrabold"
                                }
                              >
                                {completionRate}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, Math.max(0, completionRate))}%`,
                                  backgroundColor: isSubjectPassed ? "#059669" : c.primary,
                                }}
                              />
                            </div>
                          </div>

                          {/* Sub-breakdown: MCQ & Written averages */}
                          {hasAttempts && (
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-semibold mb-4">
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">MCQ Accuracy</span>
                                <span className="text-blue-700 font-extrabold text-sm">{subject.mcq_percentage}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Written (AI)</span>
                                <span className="text-indigo-700 font-extrabold text-sm">{subject.written_percentage}%</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Full-width Card Bottom CTA Button */}
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => goToChapters(subject)}
                            className={`w-full py-2.5 px-4 text-xs font-extrabold rounded-xl text-white shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow-md hover:opacity-95 ${
                              isSubjectPassed ? "bg-emerald-600 hover:bg-emerald-700" : ""
                            }`}
                            style={!isSubjectPassed ? { background: c.primary } : {}}
                          >
                            <span>{hasAttempts ? "Review Chapter Tests" : "Explore Chapter Tests"}</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEVEL 2: CHAPTERS VIEW (When subject is clicked)                         */}
          {/* ========================================================================= */}
          {viewLevel === "chapters" && selectedSubject && (
            <div className="space-y-6">
              {/* Back Button & Subject Summary Card Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={goToSubjects}
                    id="back-to-subjects-btn"
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">All Subjects</span>
                  </button>

                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-xs">
                    {getSubjectIcon(selectedSubject.name)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Subject Performance Record
                      </span>
                      {selectedSubject.total_attempts > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            selectedSubject.passed_chapters_count > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {selectedSubject.average_percentage}% Avg
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900" style={{ ...headingFont }}>
                      {selectedSubject.name} Chapters
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedSubject.chapters_attempted} of {selectedSubject.total_chapters} chapters tested · {selectedSubject.total_attempts} attempts recorded
                    </p>
                  </div>
                </div>

                {selectedSubject.total_attempts > 0 && (
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <div className="text-right">
                      <span className="text-gray-500 block text-[10px] uppercase">Subject Avg</span>
                      <span className="text-emerald-700 font-extrabold text-base">{selectedSubject.average_percentage}%</span>
                    </div>
                    <div className="hidden sm:block text-right border-l pl-3 border-gray-200">
                      <span className="text-gray-500 block text-[10px] uppercase">MCQ Avg</span>
                      <span className="text-blue-700 font-extrabold text-base">{selectedSubject.mcq_percentage}%</span>
                    </div>
                    <div className="hidden sm:block text-right border-l pl-3 border-gray-200">
                      <span className="text-gray-500 block text-[10px] uppercase">Written Avg</span>
                      <span className="text-indigo-700 font-extrabold text-base">{selectedSubject.written_percentage}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Search & Status Filter Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={chapterSearchQuery}
                      onChange={(e) => setChapterSearchQuery(e.target.value)}
                      placeholder="Search chapter title or number..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                    {chapterSearchQuery && (
                      <button
                        onClick={() => setChapterSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    value={chapterStatusFilter}
                    onChange={(e) => setChapterStatusFilter(e.target.value)}
                    id="filter-chapter-status"
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-amber-500 shadow-xs"
                  >
                    <option value="all">All Chapters</option>
                    <option value="passed">✅ Passed Only</option>
                    <option value="needs_practice">📚 Needs Practice</option>
                    <option value="not_attempted">🔒 Not Attempted</option>
                  </select>
                </div>

                <div className="text-xs font-semibold text-gray-500">
                  Showing <strong>{filteredChapters.length}</strong> chapters
                </div>
              </div>

              {/* Chapters List / Grid */}
              {filteredChapters.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-xs text-gray-500 space-y-2">
                  <BookOpen size={36} className="mx-auto text-gray-400" />
                  <div className="font-bold text-gray-700 text-sm">No chapters match your search or filter</div>
                  <p>Try changing your filter settings or searching with another keyword.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredChapters.map((ch) => {
                    const hasAttempts = ch.attempts_count > 0;
                    const isPassed = ch.status === "passed";

                    return (
                      <div
                        key={ch.id}
                        onClick={() => goToMarks(ch, selectedSubject)}
                        id={`chapter-card-${ch.id}`}
                        className={`dashboard-card cursor-pointer border transition-all duration-200 group flex flex-col justify-between ${
                          isPassed
                            ? "border-emerald-200 hover:border-emerald-400 hover:shadow-md"
                            : hasAttempts
                            ? "border-amber-200 hover:border-amber-400 hover:shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <div>
                          {/* Chapter Badge & Status */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 font-black text-xs flex items-center justify-center">
                              Ch {ch.chapter_number}
                            </span>

                            <div>
                              {isPassed ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle size={11} /> Passed
                                </span>
                              ) : hasAttempts ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                                  <Clock size={11} /> Practice Needed
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-600 flex items-center gap-1">
                                  <Lock size={10} /> Not Attempted
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subject Name Tag in Chapter Card */}
                          <div className="text-[11px] font-bold text-amber-600 mb-1 flex items-center gap-1">
                            <BookOpen size={11} />
                            <span>{selectedSubject?.name || ch.subject_name || "Subject"}</span>
                          </div>

                          {/* Chapter Title */}
                          <h3
                            className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-2 leading-snug line-clamp-2"
                            style={{ ...headingFont }}
                          >
                            {ch.title}
                          </h3>

                          {/* Score snippet */}
                          {hasAttempts ? (
                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mb-3 space-y-1 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-[11px]">Best Score:</span>
                                <span className="font-black text-gray-900">
                                  {ch.best_score} / {ch.max_score}{" "}
                                  <span className={isPassed ? "text-emerald-600" : "text-amber-600"}>
                                    ({ch.best_percentage}%)
                                  </span>
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 flex justify-between pt-1 border-t border-gray-200/60">
                                <span>MCQ: {ch.best_mcq_score}</span>
                                <span>Written: {ch.best_written_score}</span>
                                <span>Attempts: #{ch.attempts_count}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 mb-3 text-xs text-gray-500">
                              <div className="font-semibold text-gray-700">Test Available</div>
                              <div className="text-[11px]">
                                {ch.quiz?.total_mcq || 50} MCQs + {ch.quiz?.total_written || 20} Written
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            className="w-full py-2 px-3 text-xs font-extrabold rounded-xl text-white shadow-xs flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                            style={{ background: isPassed ? "#059669" : c.primary }}
                          >
                            <BarChart3 size={13} />
                            <span>Show Chapter Marks</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEVEL 3: MARKS VIEW (When chapter is clicked)                             */}
          {/* ========================================================================= */}
          {viewLevel === "marks" && selectedChapter && (
            <div className="space-y-6">
              {/* Back to Chapters button & Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => goToChapters(selectedSubject)}
                    id="back-to-chapters-btn"
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Chapters</span>
                  </button>

                  <div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      {selectedSubject?.name || "Subject"} · Chapter {selectedChapter.chapter_number}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900" style={{ ...headingFont }}>
                      {selectedChapter.title}
                    </h2>
                  </div>
                </div>

                <div>
                  {selectedChapter.status === "passed" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle size={13} /> Passing Grade Achieved
                    </span>
                  ) : selectedChapter.attempts_count > 0 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock size={13} /> Practice Needed
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-gray-100 text-gray-600 flex items-center gap-1">
                      <Lock size={12} /> Not Attempted Yet
                    </span>
                  )}
                </div>
              </div>

              {/* Main Marks Showcase Card */}
              {selectedChapter.attempts_count > 0 ? (
                <div className="space-y-6">
                  {/* Subject Info Card */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl">
                        {getSubjectIcon(selectedSubject?.name)}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500">Subject</div>
                        <div className="text-base font-extrabold text-gray-900">{selectedSubject?.name || "Subject"}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => goToChapters(selectedSubject)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors border border-amber-200"
                    >
                      <span>All {selectedSubject?.name} Chapters</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Hero Total Score Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
                          Comprehensive Chapter Test Score
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-gray-900" style={{ ...headingFont }}>
                            {selectedChapter.best_score}
                          </span>
                          <span className="text-xl font-bold text-gray-500">
                            / {selectedChapter.max_score} Marks
                          </span>
                          <span
                            className={`text-2xl font-black ml-2 ${
                              selectedChapter.status === "passed" ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            ({selectedChapter.best_percentage}%)
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Best score out of <strong>#{selectedChapter.attempts_count}</strong> attempt(s) · Passing threshold is {selectedChapter.quiz?.passing_percentage || 60}%
                        </p>
                      </div>

                      {/* Prominent Action Button: VIEW RESULT OF ALL */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleViewAllResults(selectedChapter, selectedSubject)}
                          id="view-all-results-btn"
                          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                        >
                          <Eye size={18} />
                          <span>View Result of All Questions</span>
                          <ArrowRight size={16} />
                        </button>

                        <button
                          onClick={() => navigate(`/quiz?chapter_id=${selectedChapter.id}`)}
                          id="retake-test-from-marks-btn"
                          className="px-4 py-3.5 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>Retake Test</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section Breakdown: Objective vs Subjective Marks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Objective (MCQ) Marks Card */}
                    <div className="p-6 rounded-3xl bg-white border border-blue-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-gray-900" style={{ ...headingFont }}>
                              Objective MCQ Marks
                            </h3>
                            <span className="text-[11px] text-gray-500">Multiple Choice Questions</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black text-blue-700" style={{ ...headingFont }}>
                            {selectedChapter.best_mcq_score}
                          </span>
                          <span className="text-xs text-gray-500 font-bold"> / {selectedChapter.max_mcq_score || 50}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (selectedChapter.best_mcq_score / Math.max(1, selectedChapter.max_mcq_score || 50)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                          <span>Automated Instant Scoring</span>
                          <span className="text-blue-700 font-bold">
                            {Math.round((selectedChapter.best_mcq_score / Math.max(1, selectedChapter.max_mcq_score || 50)) * 100)}% Accuracy
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        Objective test evaluates conceptual speed, accuracy, and syllabus clarity with instant automated scoring.
                      </p>
                    </div>

                    {/* Subjective (Written AI) Marks Card */}
                    <div className="p-6 rounded-3xl bg-white border border-indigo-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                            <BrainCircuit size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-1.5" style={{ ...headingFont }}>
                              <span>Subjective Marks</span>
                              <Sparkles size={14} className="text-amber-500" />
                            </h3>
                            <span className="text-[11px] text-gray-500">AI Tutor Evaluated Written Answers</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black text-indigo-700" style={{ ...headingFont }}>
                            {selectedChapter.best_written_score}
                          </span>
                          <span className="text-xs text-gray-500 font-bold"> / {selectedChapter.max_written_score || 200}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (selectedChapter.best_written_score / Math.max(1, selectedChapter.max_written_score || 200)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                          <span>AI Context & Concept Analysis</span>
                          <span className="text-indigo-700 font-bold">
                            {Math.round((selectedChapter.best_written_score / Math.max(1, selectedChapter.max_written_score || 200)) * 100)}% Quality Score
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        Written answers are analyzed by AI Tutor for conceptual depth, keyword coverage, and clarity of explanation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chapter Not Attempted Card */
                <div className="p-10 rounded-3xl bg-white border border-gray-200 text-center max-w-xl mx-auto space-y-4 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto font-black">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900" style={{ ...headingFont }}>
                      Test Not Yet Attempted
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      You haven’t taken the test for <strong>{selectedChapter.title}</strong> yet. Take the test to evaluate your understanding with MCQs and AI-evaluated subjective questions.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 max-w-sm mx-auto text-xs text-gray-600 space-y-1 text-left">
                    <div className="font-bold text-gray-800 flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-500" />
                      <span>Test Specifications:</span>
                    </div>
                    <div>• <strong>{selectedChapter.quiz?.total_mcq || 50}</strong> Objective MCQs</div>
                    <div>• <strong>{selectedChapter.quiz?.total_written || 20}</strong> Subjective written questions</div>
                    <div>• <strong>{selectedChapter.quiz?.passing_percentage || 60}%</strong> Passing threshold</div>
                  </div>

                  <PrimaryButton
                    onClick={() => navigate(`/quiz?chapter_id=${selectedChapter.id}`)}
                    id="start-test-now-btn"
                    className="px-6 py-3 text-xs font-bold inline-flex items-center gap-2 shadow-sm"
                  >
                    <BookOpen size={14} /> Start Chapter Test Now
                  </PrimaryButton>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEVEL 4: RESULT OF ALL (When "View Result" is clicked)                    */}
          {/* ========================================================================= */}
          {viewLevel === "result" && (
            <div className="space-y-6">
              {/* Back to Marks button & Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => goToMarks(selectedChapter, selectedSubject)}
                    id="back-to-marks-btn"
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Marks</span>
                  </button>

                  <div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy size={13} />
                      <span>{selectedSubject?.name} · Ch {selectedChapter?.chapter_number} Complete Results</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900" style={{ ...headingFont }}>
                      {selectedAttemptDetail?.chapter_title || selectedChapter?.title || "Test Question Results"}
                    </h2>
                  </div>
                </div>

                {selectedAttemptDetail && (
                  <button
                    onClick={() => navigate(`/quiz?chapter_id=${selectedAttemptDetail.chapter_id}`)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RotateCcw size={13} /> Retake Test
                  </button>
                )}
              </div>

              {/* Loading State for Results */}
              {resultLoading ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-gray-200 shadow-xs">
                  <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-gray-800" style={{ ...headingFont }}>
                    Loading Comprehensive Question Results...
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Retrieving student responses, correct answers, explanations, and AI evaluator feedback.
                  </p>
                </div>
              ) : resultError ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-red-200 space-y-3">
                  <AlertTriangle size={36} className="mx-auto text-red-500" />
                  <h3 className="text-base font-bold text-red-800">{resultError}</h3>
                  <PrimaryButton
                    onClick={() => handleViewAllResults(selectedChapter, selectedSubject)}
                    className="text-xs"
                  >
                    Retry Loading Results
                  </PrimaryButton>
                </div>
              ) : selectedAttemptDetail ? (
                <div className="space-y-6">
                  {/* Subject & Chapter Info Card */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-xs">
                        {getSubjectIcon(selectedSubject?.name)}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1.5">
                          <span>Subject</span>
                          <span>·</span>
                          <span>Ch {selectedChapter?.chapter_number || selectedAttemptDetail.chapter_id}</span>
                          {selectedAttemptDetail.is_passed ? (
                            <span className="text-emerald-700 font-extrabold flex items-center gap-0.5">
                              <CheckCircle size={11} /> Passed
                            </span>
                          ) : (
                            <span className="text-amber-700 font-extrabold flex items-center gap-0.5">
                              <Clock size={11} /> Needs Practice
                            </span>
                          )}
                        </div>
                        <div className="text-base font-extrabold text-gray-900" style={{ ...headingFont }}>
                          {selectedSubject?.name || "Subject"} · {selectedAttemptDetail.chapter_title || selectedChapter?.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToMarks(selectedChapter, selectedSubject)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors border border-amber-200 shadow-xs"
                      >
                        <BarChart3 size={13} />
                        <span>Chapter Marks</span>
                      </button>
                      <button
                        onClick={() => goToChapters(selectedSubject)}
                        className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors border border-gray-200 shadow-xs"
                      >
                        <BookOpen size={13} />
                        <span>All {selectedSubject?.name} Chapters</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Scorecard Hero Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Total Score</span>
                      <span className="text-2xl font-black text-gray-900 block" style={{ ...headingFont }}>
                        {selectedAttemptDetail.total_score} / {selectedAttemptDetail.max_score}
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          selectedAttemptDetail.is_passed ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {selectedAttemptDetail.percentage}% ({selectedAttemptDetail.result_label})
                      </span>
                    </div>

                    <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-blue-800 block mb-1">MCQ Score</span>
                      <span className="text-2xl font-black text-blue-900 block" style={{ ...headingFont }}>
                        {selectedAttemptDetail.mcq?.score} / {selectedAttemptDetail.mcq?.max_score}
                      </span>
                      <span className="text-xs font-bold text-blue-700">
                        {selectedAttemptDetail.mcq?.correct} / {selectedAttemptDetail.mcq?.total_questions} Correct
                      </span>
                    </div>

                    <div className="p-4 bg-white border border-indigo-200 rounded-2xl shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-indigo-800 block mb-1">Subjective (AI)</span>
                      <span className="text-2xl font-black text-indigo-900 block" style={{ ...headingFont }}>
                        {selectedAttemptDetail.subjective?.score} / {selectedAttemptDetail.subjective?.max_score}
                      </span>
                      <span className="text-xs font-bold text-indigo-700">
                        {selectedAttemptDetail.subjective?.percentage}% Quality Score
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Time Spent</span>
                      <span className="text-2xl font-black text-gray-900 block" style={{ ...headingFont }}>
                        {selectedAttemptDetail.time_taken || "N/A"}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        Attempt #{selectedAttemptDetail.attempt_number || 1}
                      </span>
                    </div>
                  </div>

                  {/* Filter Tabs: All Questions / MCQs / Subjective */}
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuestionTab("all")}
                        id="tab-all-questions"
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          questionTab === "all"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        All Questions ({(selectedAttemptDetail.mcq?.questions?.length || 0) + (selectedAttemptDetail.subjective?.questions?.length || 0)})
                      </button>

                      <button
                        onClick={() => setQuestionTab("mcq")}
                        id="tab-mcq-questions"
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          questionTab === "mcq"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <CheckCircle size={14} />
                        <span>MCQs ({selectedAttemptDetail.mcq?.questions?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => setQuestionTab("subjective")}
                        id="tab-subjective-questions"
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          questionTab === "subjective"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <BrainCircuit size={14} />
                        <span>Subjective AI ({selectedAttemptDetail.subjective?.questions?.length || 0})</span>
                      </button>
                    </div>

                    {/* Sub-filter for MCQs (Correct / Wrong) */}
                    {(questionTab === "all" || questionTab === "mcq") && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 text-[11px] font-semibold">MCQ Filter:</span>
                        <button
                          onClick={() => setMcqFilter("all")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            mcqFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setMcqFilter("correct")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            mcqFilter === "correct" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          Correct ({selectedAttemptDetail.mcq?.correct || 0})
                        </button>
                        <button
                          onClick={() => setMcqFilter("wrong")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            mcqFilter === "wrong" ? "bg-red-600 text-white" : "bg-red-50 text-red-800 hover:bg-red-100"
                          }`}
                        >
                          Wrong ({selectedAttemptDetail.mcq?.wrong || 0})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 1. Multiple Choice Questions List */}
                  {(questionTab === "all" || questionTab === "mcq") && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-extrabold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
                          <CheckCircle size={18} className="text-blue-600" />
                          <span>Objective Multiple Choice Questions</span>
                          <span className="text-xs font-semibold text-gray-500">
                            (Score: {selectedAttemptDetail.mcq?.score} / {selectedAttemptDetail.mcq?.max_score})
                          </span>
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {selectedAttemptDetail.mcq?.questions
                          ?.filter((q) => {
                            if (mcqFilter === "correct") return q.is_correct;
                            if (mcqFilter === "wrong") return !q.is_correct;
                            return true;
                          })
                          .map((q, idx) => {
                            const isCorrect = q.is_correct;
                            const isUnanswered = q.status === "unanswered";

                            return (
                              <div
                                key={q.id || idx}
                                className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all bg-white ${
                                  isCorrect
                                    ? "border-emerald-200 hover:border-emerald-300"
                                    : isUnanswered
                                    ? "border-gray-200"
                                    : "border-red-200 hover:border-red-300"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-extrabold text-gray-900 text-sm">
                                    Q{q.order_num || idx + 1}. {q.question_text}
                                  </span>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isCorrect ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                        <Check size={11} /> Correct (+{q.marks_obtained})
                                      </span>
                                    ) : isUnanswered ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-200 text-gray-700">
                                        Unanswered (0)
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 flex items-center gap-1">
                                        <X size={11} /> Wrong (0)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Options grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {(Array.isArray(q.options) ? q.options : []).map((opt, oIdx) => {
                                    const optKey =
                                      typeof opt === "string"
                                        ? String.fromCharCode(65 + oIdx)
                                        : opt.letter || opt.key || String.fromCharCode(65 + oIdx);
                                    const optText = typeof opt === "string" ? opt : opt.text || opt.value || "";
                                    const isSelected =
                                      String(q.selected_option).toUpperCase() === String(optKey).toUpperCase();
                                    const isAnswer =
                                      String(q.correct_answer).toUpperCase() === String(optKey).toUpperCase();

                                    let optClass = "border-gray-200 bg-gray-50/50 text-gray-700";
                                    if (isAnswer) {
                                      optClass = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-400";
                                    } else if (isSelected && !isAnswer) {
                                      optClass = "border-red-400 bg-red-50 text-red-900 line-through";
                                    }

                                    return (
                                      <div
                                        key={oIdx}
                                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${optClass}`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[10px] ${
                                            isAnswer
                                              ? "bg-emerald-600 text-white"
                                              : isSelected
                                              ? "bg-red-500 text-white"
                                              : "bg-gray-200 text-gray-700"
                                          }`}
                                        >
                                          {optKey}
                                        </span>
                                        <span className="flex-1 text-[11px]">{optText}</span>
                                        {isSelected && (
                                          <span className="text-[10px] uppercase font-bold text-gray-500">
                                            (Your Choice)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Explanation */}
                                {q.explanation && (
                                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-gray-700">
                                    <strong className="text-gray-900">Explanation:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 2. Subjective (Written) Questions List */}
                  {(questionTab === "all" || questionTab === "subjective") && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-extrabold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
                          <BrainCircuit size={18} className="text-indigo-600" />
                          <span>Subjective Written Questions (AI Evaluation)</span>
                          <span className="text-xs font-semibold text-gray-500">
                            (Score: {selectedAttemptDetail.subjective?.score} / {selectedAttemptDetail.subjective?.max_score})
                          </span>
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {selectedAttemptDetail.subjective?.questions?.map((wq, idx) => (
                          <div
                            key={wq.id || idx}
                            className="p-5 rounded-2xl bg-white border border-indigo-200 text-xs space-y-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-extrabold text-gray-900 text-sm">
                                W{wq.order_num || idx + 1}. {wq.question_text}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 flex-shrink-0">
                                {wq.score} / {wq.max_score} Marks ({wq.percentage}%)
                              </span>
                            </div>

                            {/* Student Answer */}
                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                              <div className="text-[10px] font-bold uppercase text-gray-500 flex justify-between">
                                <span>Your Submitted Answer:</span>
                                <span>{wq.word_count || 0} words</span>
                              </div>
                              <p className="text-gray-800 text-[11px] whitespace-pre-wrap leading-relaxed font-medium">
                                {wq.student_answer || "(No answer provided)"}
                              </p>
                            </div>

                            {/* AI Evaluator Feedback */}
                            <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-amber-100/50 rounded-xl border border-amber-200/80 space-y-2">
                              <div className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-600" />
                                <span>AI Tutor Feedback & Assessment:</span>
                              </div>
                              <p className="text-gray-800 text-[11px] leading-relaxed font-medium">
                                {wq.feedback}
                              </p>

                              {/* Strengths & Improvements */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                                {Array.isArray(wq.strengths) && wq.strengths.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-1">
                                      Key Strengths:
                                    </span>
                                    <ul className="space-y-1">
                                      {wq.strengths.map((str, sIdx) => (
                                        <li key={sIdx} className="text-[10px] text-emerald-900 flex items-center gap-1 font-medium">
                                          <Check size={11} className="text-emerald-600 flex-shrink-0" />
                                          <span>{str}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {Array.isArray(wq.improvements) && wq.improvements.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-amber-900 block mb-1">
                                      Areas to Improve:
                                    </span>
                                    <ul className="space-y-1">
                                      {wq.improvements.map((imp, iIdx) => (
                                        <li key={iIdx} className="text-[10px] text-amber-950 flex items-center gap-1 font-medium">
                                          <span>•</span>
                                          <span>{imp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Return Actions */}
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <button
                      onClick={() => goToMarks(selectedChapter, selectedSubject)}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <ArrowLeft size={14} /> Back to Marks
                    </button>

                    <PrimaryButton
                      onClick={() => navigate(`/quiz?chapter_id=${selectedAttemptDetail.chapter_id}`)}
                      className="px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw size={14} /> Retake Test
                    </PrimaryButton>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
