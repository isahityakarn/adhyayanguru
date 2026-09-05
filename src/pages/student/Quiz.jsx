import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Sparkles,
  Lock,
  Unlock,
  Clock,
  Bookmark,
  Send,
  FileText,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  History,
  Award,
  Loader2
} from "lucide-react";
import { Card, Bar, PrimaryButton } from "../../components/UI";
import { get, post } from "../../utils/api";
import { c, headingFont } from "../../utils/theme";

export default function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const chapterIdParam = searchParams.get("chapter_id");

  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(chapterIdParam || "");

  // Quiz status and lock check
  const [quizStatus, setQuizStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Active Quiz State
  const [quizData, setQuizData] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState("mcq"); // "mcq" | "written"
  const [mcqIndex, setMcqIndex] = useState(0);
  const [writtenIndex, setWrittenIndex] = useState(0);
  const [showNavPanel, setShowNavPanel] = useState(false);

  // Student Responses State
  const [mcqAnswers, setMcqAnswers] = useState({}); // { qId: { option: 'A', marked: false } }
  const [writtenAnswers, setWrittenAnswers] = useState({}); // { qId: { text: '...', saved: true } }

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const timerRef = useRef(null);

  // Submission & Processing State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState({ completed: 0, total: 20, status: 'processing' });
  const [finalResult, setFinalResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Detailed view toggles in result screen
  const [showMcqDetails, setShowMcqDetails] = useState(false);
  const [expandedWrittenId, setExpandedWrittenId] = useState(null);

  // 1. Load chapters on mount
  useEffect(() => {
    loadChapters();
  }, []);

  // 2. Check quiz status when selected chapter changes
  useEffect(() => {
    if (selectedChapterId) {
      checkQuizStatus(selectedChapterId);
    }
  }, [selectedChapterId]);

  // 3. Countdown timer effect
  useEffect(() => {
    if (isQuizActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            autoSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isQuizActive, secondsRemaining]);

  async function loadChapters() {
    try {
      const response = await get("/chapters");
      const list = response.chapters || response || [];
      setChapters(list);
      if (!selectedChapterId && list.length > 0) {
        setSelectedChapterId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load chapters:", err);
    }
  }

  async function checkQuizStatus(chId) {
    setStatusLoading(true);
    setErrorMsg("");
    setIsQuizActive(false);
    setFinalResult(null);

    try {
      const res = await get(`/chapters/${chId}/quiz/status`);
      setQuizStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch quiz status:", err);
      setErrorMsg("Could not load quiz status for this chapter.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleStartQuiz() {
    if (!quizStatus?.quiz_unlocked) {
      setErrorMsg("Complete the chapter before starting the quiz.");
      return;
    }

    setIsLoadingQuiz(true);
    setErrorMsg("");

    try {
      // 1. Start attempt on backend (server side completion verification!)
      const startRes = await post(`/chapters/${selectedChapterId}/quiz/start`);
      if (!startRes.success) {
        setErrorMsg(startRes.message || "Failed to start quiz.");
        setIsLoadingQuiz(false);
        return;
      }

      const attId = startRes.data.attempt_id;
      setAttemptId(attId);

      // 2. Fetch Quiz questions
      const quizRes = await get(`/chapters/${selectedChapterId}/quiz`);
      setQuizData(quizRes.data);

      // Initialize answer states
      const initialMcq = {};
      (quizRes.data.mcq_questions || []).forEach((q) => {
        initialMcq[q.id] = { option: null, marked: false };
      });
      setMcqAnswers(initialMcq);

      const initialWritten = {};
      (quizRes.data.written_questions || []).forEach((q) => {
        initialWritten[q.id] = { text: "", wordCount: 0 };
      });
      setWrittenAnswers(initialWritten);

      // Initialize Timer
      const limitMins = quizRes.data.time_limit_minutes || 45;
      setSecondsRemaining(limitMins * 60);

      setMcqIndex(0);
      setWrittenIndex(0);
      setActiveTab("mcq");
      setIsQuizActive(true);
    } catch (err) {
      console.error("Error starting quiz:", err);
      setErrorMsg(err.message || "Could not start quiz. Make sure chapter is completed.");
    } finally {
      setIsLoadingQuiz(false);
    }
  }

  // Handle MCQ selection
  const handleSelectOption = (qId, letter) => {
    setMcqAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], option: letter }
    }));
    // Save answer to backend autosave API
    post(`/quiz-attempts/${attemptId}/mcq-answer`, {
      question_id: qId,
      selected_option: letter,
      is_marked_for_review: mcqAnswers[qId]?.marked || false
    }).catch((err) => console.error("Autosave MCQ failed:", err));
  };

  // Toggle Mark for Review
  const handleToggleMarkReview = (qId) => {
    const newMarked = !mcqAnswers[qId]?.marked;
    setMcqAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], marked: newMarked }
    }));
    post(`/quiz-attempts/${attemptId}/mcq-answer`, {
      question_id: qId,
      selected_option: mcqAnswers[qId]?.option || null,
      is_marked_for_review: newMarked
    }).catch((err) => console.error("Autosave Mark Review failed:", err));
  };

  // Clear MCQ selection
  const handleClearMcq = (qId) => {
    setMcqAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], option: null }
    }));
    post(`/quiz-attempts/${attemptId}/mcq-answer`, {
      question_id: qId,
      selected_option: null,
      is_marked_for_review: mcqAnswers[qId]?.marked || false
    }).catch((err) => console.error("Autosave Clear MCQ failed:", err));
  };

  // Handle Written Answer Text Change with Autosave
  const handleWrittenChange = (qId, text) => {
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    setWrittenAnswers((prev) => ({
      ...prev,
      [qId]: { text, wordCount: words }
    }));

    // Debounced or direct autosave
    post(`/quiz-attempts/${attemptId}/written-answer`, {
      question_id: qId,
      answer: text
    }).catch((err) => console.error("Autosave written answer failed:", err));
  };

  // Auto submission when timer hits 0
  const autoSubmitQuiz = async () => {
    setShowSubmitModal(false);
    await processQuizSubmission();
  };

  // Process Quiz Submission & AI Evaluation
  const processQuizSubmission = async () => {
    setIsSubmitting(true);
    setIsEvaluating(true);
    setErrorMsg("");

    try {
      const subRes = await post(`/quiz-attempts/${attemptId}/submit`);
      
      // Poll AI evaluation status
      await pollEvaluationStatus(attemptId);
      
      // Fetch final results
      const resData = await get(`/quiz-attempts/${attemptId}/result`);
      setFinalResult(resData.data);
      setIsQuizActive(false);
      
      // Refresh status info for chapter card
      checkQuizStatus(selectedChapterId);
    } catch (err) {
      console.error("Submission failed:", err);
      setErrorMsg("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
      setShowSubmitModal(false);
    }
  };

  // Poll evaluation status until status === 'completed'
  const pollEvaluationStatus = async (attId) => {
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 30) {
      attempts++;
      try {
        const st = await get(`/quiz-attempts/${attId}/evaluation-status`);
        setEvalProgress({ completed: st.completed, total: st.total, status: st.status });
        if (st.status === 'completed' || st.completed >= st.total) {
          completed = true;
          break;
        }
      } catch {
        // ignore polling errors
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  };

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe Option Normalization (Handles objects, raw strings, and array formats)
  const getNormalizedOptions = (rawOptions) => {
    if (!rawOptions) return [];
    let opts = rawOptions;
    if (typeof opts === "string") {
      try { opts = JSON.parse(opts); } catch (e) { opts = []; }
    }
    if (!Array.isArray(opts)) return [];

    return opts.map((opt, idx) => {
      const defaultLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'
      if (typeof opt === "object" && opt !== null) {
        return {
          letter: opt.letter || defaultLetter,
          text: opt.text || opt.option || opt.label || ""
        };
      }
      if (typeof opt === "string") {
        const cleaned = opt.replace(/^[A-D][.\s\)-]+/i, "").trim();
        return {
          letter: defaultLetter,
          text: cleaned || opt
        };
      }
      return { letter: defaultLetter, text: String(opt) };
    });
  };

  // Calculated stats for Navigator and Submission Modal
  const mcqQuestions = quizData?.mcq_questions || [];
  const writtenQuestions = quizData?.written_questions || [];

  const mcqAnsweredCount = Object.values(mcqAnswers).filter((a) => a.option !== null).length;
  const mcqUnansweredCount = mcqQuestions.length - mcqAnsweredCount;
  const mcqMarkedCount = Object.values(mcqAnswers).filter((a) => a.marked).length;

  const writtenAnsweredCount = Object.values(writtenAnswers).filter((a) => a.text && a.text.trim().length > 0).length;
  const writtenUnansweredCount = writtenQuestions.length - writtenAnsweredCount;

  const totalQuestions = mcqQuestions.length + writtenQuestions.length;
  const totalAnswered = mcqAnsweredCount + writtenAnsweredCount;
  const overallProgressPct = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  const currentMcqQ = mcqQuestions[mcqIndex];
  const currentWrittenQ = writtenQuestions[writtenIndex];

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      {/* 1. Header & Chapter Selector */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: c.primary }}>
            <BookOpen size={14} /> Chapter Assessment & Quiz
          </div>
          <h1 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
            {quizData
              ? `${quizData.class_name} → ${quizData.subject_name} → Chapter ${quizData.chapter_number}`
              : "Chapter Quiz Portal"}
          </h1>
        </div>

        {!isQuizActive && !isEvaluating && (
          <Link
            to="/chapters"
            className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ArrowLeft size={14} /> Back to Chapters
          </Link>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-3">
          <AlertTriangle size={20} />
          {errorMsg}
        </div>
      )}

      {/* 2. Lock / Pre-quiz Overview State */}
      {statusLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Verifying chapter completion status...</p>
        </div>
      ) : !isQuizActive && !isEvaluating && !finalResult ? (
        <div className="space-y-6">
          {/* Chapter Locked Notice */}
          {!quizStatus?.chapter_completed ? (
            <div className="p-8 rounded-2xl bg-amber-50/80 border border-amber-200 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-700">
                <Lock size={36} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-amber-900" style={{ ...headingFont }}>
                🔒 Quiz Locked
              </h2>
              <p className="text-sm text-amber-800 mb-6 leading-relaxed">
                Complete this chapter to unlock the quiz. Read through the chapter content and complete practice activities to gain access.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to={`/tutor?chapter_id=${selectedChapterId}`}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all"
                  style={{ background: c.primary }}
                >
                  Study Chapter Now
                </Link>
                <Link
                  to="/chapters"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  View All Chapters
                </Link>
              </div>
            </div>
          ) : (
            /* Chapter Completed -> Quiz Unlocked Card */
            <div className="dashboard-card border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-50/30 to-amber-50/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Unlock size={26} />
                </div>
                <div>
                  <div className="app-badge app-badge-success text-[10px] uppercase font-bold tracking-wider">
                    🔓 Quiz Unlocked
                  </div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ ...headingFont }}>
                    Chapter Test & Quiz
                  </h2>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Test your knowledge with <strong>50 MCQs</strong> and <strong>20 written questions</strong>.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                  <span className="block text-2xl font-extrabold text-amber-600">50</span>
                  <span className="text-xs font-semibold text-gray-500">MCQs</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                  <span className="block text-2xl font-extrabold text-indigo-600">20</span>
                  <span className="text-xs font-semibold text-gray-500">Written Questions</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                  <span className="block text-2xl font-extrabold text-emerald-600">45 Min</span>
                  <span className="text-xs font-semibold text-gray-500">Time Limit</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                  <span className="block text-2xl font-extrabold text-amber-500">
                    {quizStatus?.best_score > 0 ? `${quizStatus.best_score}%` : 'N/A'}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">Best Score</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500">
                  Total Attempts: <strong className="text-gray-800">{quizStatus?.attempts || 0}</strong>
                </div>
                <PrimaryButton
                  onClick={handleStartQuiz}
                  disabled={isLoadingQuiz}
                  className="px-6 py-3 text-base flex items-center gap-2"
                >
                  {isLoadingQuiz ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Starting Quiz...
                    </>
                  ) : (
                    <>
                      Start Quiz <ArrowRight size={18} />
                    </>
                  )}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      ) : isEvaluating ? (
        /* 3. AI Evaluation Loading Screen (Prompt Section 27) */
        <div className="dashboard-card text-center py-16 bg-amber-50/40 border border-amber-200">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900" style={{ ...headingFont }}>
            Evaluating your answers...
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-8">
            Please wait while our server scores your MCQs and AI evaluates your written responses.
          </p>

          <div className="max-w-md mx-auto text-left space-y-3 bg-white p-5 rounded-xl border border-gray-200 mb-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
              <CheckCircle size={18} />
              <span>MCQ evaluation complete</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
              <CheckCircle size={18} />
              <span>Written answers submitted</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-amber-600">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>
                AI is evaluating written answers ({evalProgress.completed} / {evalProgress.total})...
              </span>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <Bar pct={evalProgress.total > 0 ? Math.round((evalProgress.completed / evalProgress.total) * 100) : 0} color={c.primary} />
          </div>
        </div>
      ) : finalResult ? (
        /* 4. Final Result View (Prompt Section 10 & 11) */
        <div className="space-y-6">
          {/* Result Header Banner */}
          <div
            className={`dashboard-card text-center py-8 ${
              finalResult.status === "passed" ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                finalResult.status === "passed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              {finalResult.status === "passed" ? <Trophy size={42} /> : <BookOpen size={42} />}
            </div>

            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2 ${
                finalResult.status === "passed" ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"
              }`}
            >
              {finalResult.status === "passed" ? "✅ Passed" : "📚 Keep Practicing"}
            </span>

            <h2 className="text-3xl font-extrabold mb-1" style={{ ...headingFont, color: c.dark }}>
              🎉 Quiz Completed
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-6">
              {finalResult.class_name} · {finalResult.subject_name} · Chapter {finalResult.chapter_number}: {finalResult.chapter_title}
            </p>

            {/* Score Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-center shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">MCQ Score</span>
                <span className="text-2xl font-extrabold text-amber-600">{finalResult.mcq.score} / {finalResult.mcq.max_score}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-center shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Written Score</span>
                <span className="text-2xl font-extrabold text-indigo-600">{finalResult.written.score} / {finalResult.written.max_score}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-center shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Score</span>
                <span className="text-2xl font-extrabold text-gray-900">{finalResult.total_score} / {finalResult.max_score}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-center shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Percentage</span>
                <span
                  className={`text-2xl font-extrabold ${
                    finalResult.percentage >= finalResult.passing_percentage ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {finalResult.percentage}%
                </span>
              </div>
            </div>

            <div className="max-w-md mx-auto mb-6">
              <Bar pct={finalResult.percentage} color={finalResult.status === "passed" ? "#10b981" : c.primary} />
              <div className="flex justify-between text-xs font-semibold text-gray-500 mt-1">
                <span>Passing Mark: {finalResult.passing_percentage}%</span>
                <span>Time Taken: {finalResult.time_taken}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <PrimaryButton onClick={handleStartQuiz} className="flex items-center gap-2 text-sm px-5 py-2.5">
                <RotateCcw size={16} /> Retake Quiz
              </PrimaryButton>
              <button
                onClick={() => navigate('/quiz-history')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                View History
              </button>
            </div>
          </div>

          {/* AI Written Evaluation Detailed Breakdown */}
          <div className="dashboard-card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ ...headingFont, color: c.dark }}>
              <Sparkles size={20} color={c.primary} /> AI Written Answers Feedback
            </h3>

            <div className="space-y-4">
              {(finalResult.detailed_written || []).map((wq, idx) => {
                const isExpanded = expandedWrittenId === wq.id;
                return (
                  <div key={wq.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div
                      onClick={() => setExpandedWrittenId(isExpanded ? null : wq.id)}
                      className="p-4 bg-gray-50 hover:bg-gray-100/80 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          W{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{wq.question_text}</h4>
                          <span className="text-xs font-semibold text-gray-500">
                            Score: <strong>{wq.score} / {wq.max_score}</strong> ({Math.round((wq.score / wq.max_score) * 100)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`app-badge text-[10px] font-bold uppercase ${
                            wq.score / wq.max_score >= 0.7 ? "app-badge-success" : "app-badge-warning"
                          }`}
                        >
                          {wq.score / wq.max_score >= 0.7 ? "Good" : "Needs Review"}
                        </span>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 space-y-4 border-t border-gray-200">
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Your Written Answer:</span>
                          <p className="text-sm p-3 bg-gray-50 rounded-lg text-gray-800 font-medium italic border border-gray-200">
                            {wq.student_answer || "(No answer provided)"}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Model / Expected Answer:</span>
                          <p className="text-xs p-3 bg-emerald-50/70 rounded-lg text-emerald-900 font-medium border border-emerald-200">
                            {wq.expected_answer}
                          </p>
                        </div>

                        {/* AI Feedback Box */}
                        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                          <div className="text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
                            <Sparkles size={14} /> AI Evaluator Feedback:
                          </div>
                          <p className="text-sm text-amber-950 font-medium">{wq.feedback}</p>

                          {wq.strengths?.length > 0 && (
                            <div className="pt-2">
                              <span className="text-xs font-bold text-emerald-800 block mb-1">Key Strengths:</span>
                              <ul className="list-disc list-inside text-xs text-emerald-900 space-y-1 font-semibold">
                                {wq.strengths.map((st, i) => (
                                  <li key={i}>{st}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {wq.improvements?.length > 0 && (
                            <div className="pt-1">
                              <span className="text-xs font-bold text-amber-800 block mb-1">Suggestions for Improvement:</span>
                              <ul className="list-disc list-inside text-xs text-amber-900 space-y-1 font-semibold">
                                {wq.improvements.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 5. Active Quiz Interface (Prompt Sections 2, 3, 4, 5, 6) */
        <div className="space-y-4">
          {/* Top Sticky Header */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-2 z-20">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {activeTab === "mcq" ? `MCQ Section (${mcqIndex + 1} of ${mcqQuestions.length})` : `Written Section (${writtenIndex + 1} of ${writtenQuestions.length})`}
              </div>
              <div className="text-sm font-bold text-gray-900">
                Total Progress: {totalAnswered} / {totalQuestions} Answered ({overallProgressPct}%)
              </div>
            </div>

            {/* Live Timer */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-extrabold">
              <Clock size={16} />
              <span>Time Remaining: {formatTime(secondsRemaining)}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNavPanel(!showNavPanel)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <LayoutGrid size={14} /> Navigator ({totalAnswered}/{totalQuestions})
              </button>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
              >
                <Send size={14} /> Submit Quiz
              </button>
            </div>
          </div>

          <Bar pct={overallProgressPct} color={c.primary} />

          {/* Section Toggle Tabs (MCQs vs Written) */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("mcq")}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "mcq"
                  ? "border-amber-500 text-amber-600 bg-amber-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>50 MCQs</span>
              <span className="app-badge app-badge-info text-[10px]">{mcqAnsweredCount}/50</span>
            </button>

            <button
              onClick={() => setActiveTab("written")}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "written"
                  ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>20 Written Questions</span>
              <span className="app-badge app-badge-warning text-[10px]">{writtenAnsweredCount}/20</span>
            </button>
          </div>

          {/* Question Navigator Side Drawer / Overlay */}
          {showNavPanel && (
            <div className="dashboard-card border-2 border-amber-300 bg-amber-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid size={16} /> Question Navigator
                </h3>
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Answered</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/> Marked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"/> Unanswered</span>
                </div>
              </div>

              {/* MCQs Grid */}
              <div className="mb-4">
                <span className="text-xs font-extrabold text-gray-500 block mb-2">MCQ Questions (1 - 50)</span>
                <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 gap-1.5">
                  {mcqQuestions.map((q, idx) => {
                    const ans = mcqAnswers[q.id];
                    const isCurrent = activeTab === "mcq" && mcqIndex === idx;
                    const isAns = ans?.option !== null;
                    const isMarked = ans?.marked;

                    let bg = "bg-gray-100 text-gray-700 border-gray-200";
                    if (isAns) bg = "bg-emerald-500 text-white border-emerald-600";
                    if (isMarked) bg = "bg-amber-400 text-amber-950 font-bold border-amber-500";

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setActiveTab("mcq");
                          setMcqIndex(idx);
                        }}
                        className={`h-8 rounded-lg text-xs font-bold border flex items-center justify-center transition-all ${bg} ${
                          isCurrent ? "ring-2 ring-offset-1 ring-amber-600 font-extrabold scale-105" : ""
                        }`}
                      >
                        {isMarked ? "🔖" : idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written Grid */}
              <div>
                <span className="text-xs font-extrabold text-gray-500 block mb-2">Written Questions (W1 - W20)</span>
                <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 gap-1.5">
                  {writtenQuestions.map((wq, idx) => {
                    const ans = writtenAnswers[wq.id];
                    const isCurrent = activeTab === "written" && writtenIndex === idx;
                    const isAns = ans?.text && ans.text.trim().length > 0;

                    let bg = isAns ? "bg-indigo-600 text-white border-indigo-700" : "bg-gray-100 text-gray-700 border-gray-200";

                    return (
                      <button
                        key={wq.id}
                        onClick={() => {
                          setActiveTab("written");
                          setWrittenIndex(idx);
                        }}
                        className={`h-8 rounded-lg text-xs font-bold border flex items-center justify-center transition-all ${bg} ${
                          isCurrent ? "ring-2 ring-offset-1 ring-indigo-600 font-extrabold scale-105" : ""
                        }`}
                      >
                        W{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE TAB 1: MCQ QUESTION VIEW */}
          {activeTab === "mcq" && currentMcqQ && (
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <span className="app-badge app-badge-info text-xs font-bold uppercase">
                  Question {mcqIndex + 1} of {mcqQuestions.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleMarkReview(currentMcqQ.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                      mcqAnswers[currentMcqQ.id]?.marked
                        ? "bg-amber-100 text-amber-800 border-amber-400"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Bookmark size={14} />
                    {mcqAnswers[currentMcqQ.id]?.marked ? "Marked for Review 🔖" : "Mark for Review"}
                  </button>

                  {mcqAnswers[currentMcqQ.id]?.option && (
                    <button
                      onClick={() => handleClearMcq(currentMcqQ.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-red-600 underline"
                    >
                      Clear Answer
                    </button>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-bold mb-6 text-gray-900 leading-snug" style={{ ...headingFont }}>
                {currentMcqQ.question_text}
              </h2>

              {currentMcqQ.image_url && (
                <div className="mb-6 max-w-md">
                  <img src={currentMcqQ.image_url} alt="Question Diagram" className="rounded-xl border border-gray-200 max-h-60 object-contain" />
                </div>
              )}

              {/* 4 Options Buttons */}
              <div className="grid grid-cols-1 gap-3 mb-8">
                {getNormalizedOptions(currentMcqQ.options).map((opt) => {
                  const isSelected = mcqAnswers[currentMcqQ.id]?.option === opt.letter;

                  return (
                    <button
                      type="button"
                      key={opt.letter}
                      onClick={() => handleSelectOption(currentMcqQ.id, opt.letter)}
                      className={`w-full flex items-center gap-4 rounded-2xl p-4 text-left font-semibold transition-all duration-200 border-2 shadow-xs cursor-pointer select-none active:scale-[0.99] group ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/90 text-amber-950 shadow-md ring-2 ring-amber-400/40"
                          : "border-gray-200 bg-white text-gray-800 hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-gray-100 text-gray-700 border border-gray-200 group-hover:bg-amber-500 group-hover:text-white"
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <span className="flex-1 text-base leading-relaxed">{opt.text}</span>
                      {isSelected && (
                        <CheckCircle className="text-amber-600 flex-shrink-0" size={22} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  disabled={mcqIndex === 0}
                  onClick={() => setMcqIndex(mcqIndex - 1)}
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                {mcqIndex + 1 < mcqQuestions.length ? (
                  <PrimaryButton onClick={() => setMcqIndex(mcqIndex + 1)} className="px-6 py-2 text-sm flex items-center gap-2">
                    Next <ArrowRight size={16} />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    onClick={() => setActiveTab("written")}
                    className="px-6 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                  >
                    Go to Written Section <ChevronRight size={16} />
                  </PrimaryButton>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB 2: WRITTEN QUESTION VIEW */}
          {activeTab === "written" && currentWrittenQ && (
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <span className="app-badge app-badge-warning text-xs font-bold uppercase">
                  Written Question {writtenIndex + 1} of {writtenQuestions.length}
                </span>

                <span className="text-xs font-semibold text-gray-500">Marks: {currentWrittenQ.marks || 10}</span>
              </div>

              <h2 className="text-lg font-bold mb-4 text-gray-900 leading-snug" style={{ ...headingFont }}>
                {currentWrittenQ.question_text}
              </h2>

              <p className="text-xs text-gray-500 mb-3 italic">
                Provide a structured answer. Answer length guidance: {currentWrittenQ.min_words || 20} to {currentWrittenQ.max_words || 300} words.
              </p>

              {/* Text area input */}
              <div className="mb-4">
                <textarea
                  rows={6}
                  className="form-control text-sm font-medium w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Type your detailed answer here..."
                  value={writtenAnswers[currentWrittenQ.id]?.text || ""}
                  onChange={(e) => handleWrittenChange(currentWrittenQ.id, e.target.value)}
                />
                <div className="flex justify-between items-center mt-2 text-xs font-semibold text-gray-500">
                  <span>
                    Words: <strong className="text-indigo-600">{writtenAnswers[currentWrittenQ.id]?.wordCount || 0}</strong> / {currentWrittenQ.max_words || 300}
                  </span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check size={14} /> Autosaved
                  </span>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  disabled={writtenIndex === 0}
                  onClick={() => setWrittenIndex(writtenIndex - 1)}
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                {writtenIndex + 1 < writtenQuestions.length ? (
                  <PrimaryButton onClick={() => setWrittenIndex(writtenIndex + 1)} className="px-6 py-2 text-sm flex items-center gap-2">
                    Next Written Question <ArrowRight size={16} />
                  </PrimaryButton>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md flex items-center gap-2"
                  >
                    <Send size={16} /> Finalize & Submit Quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Submission Confirmation Modal (Prompt Section 6) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
              <Send size={22} className="text-emerald-600" /> Submit Quiz?
            </h3>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
              <div>
                <span className="font-bold text-gray-800 block mb-1">MCQs (50 Questions):</span>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-emerald-700">Answered: {mcqAnsweredCount}</span>
                  <span className="text-amber-700">Unanswered: {mcqUnansweredCount}</span>
                  {mcqMarkedCount > 0 && <span className="text-indigo-700">Marked: {mcqMarkedCount}</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-800 block mb-1">Written (20 Questions):</span>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-emerald-700">Answered: {writtenAnsweredCount}</span>
                  <span className="text-amber-700">Unanswered: {writtenUnansweredCount}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to submit? Once submitted, your written answers will be evaluated by AI and your final result generated.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                disabled={isSubmitting}
                onClick={processQuizSubmission}
                className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Quiz <CheckCircle size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
