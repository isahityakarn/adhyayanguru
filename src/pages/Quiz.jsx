import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  Check,
  Award
} from "lucide-react";
import { Card, Bar, PrimaryButton } from "../components/UI";
import { get } from "../utils/api";
import { c, headingFont } from "../utils/theme";

export default function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const chapterIdParam = searchParams.get("chapter_id");

  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(chapterIdParam || "");
  const [chapterInfo, setChapterInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Quiz interactive state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Load available chapters
  useEffect(() => {
    loadChapters();
  }, []);

  // When selected chapter changes, fetch its real questions
  useEffect(() => {
    if (selectedChapterId) {
      loadChapterQuestions(selectedChapterId);
    }
  }, [selectedChapterId]);

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

  async function loadChapterQuestions(chapterId) {
    setIsLoading(true);
    setError("");
    setQuizFinished(false);
    setCurrentIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);

    try {
      const response = await get(`/chapters/${chapterId}/questions`);
      setChapterInfo(response.chapter);
      const qList = response.questions || [];
      setQuestions(qList);
    } catch (err) {
      console.error("Failed to load chapter questions:", err);
      setError("Could not load questions for this chapter.");
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectOption = (letter) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(letter);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;

    const currentQ = questions[currentIndex];
    const isCorrect = selectedOption === currentQ.correct_answer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers({
      ...userAnswers,
      [currentIndex]: {
        selected: selectedOption,
        correct: isCorrect,
        correct_answer: currentQ.correct_answer,
      },
    });

    setIsAnswerSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers({});
    setScore(0);
    setQuizFinished(false);
  };

  const currentQ = questions[currentIndex];
  const progressPct = questions.length > 0 ? Math.round(((currentIndex + (quizFinished ? 1 : 0)) / questions.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Chapter Selection & Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.primary }}>
            Practice Assessment & Quiz
          </div>
          <h1 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
            {chapterInfo ? `${chapterInfo.subject} · Ch ${chapterInfo.chapter_number}: ${chapterInfo.title}` : "Interactive Chapter Quiz"}
          </h1>
        </div>

        {/* Chapter Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">Chapter:</label>
          <select
            className="form-control"
            style={{ minHeight: 38, padding: "6px 12px", width: "auto" }}
            value={selectedChapterId}
            onChange={(e) => {
              setSelectedChapterId(e.target.value);
              setSearchParams({ chapter_id: e.target.value });
            }}
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Ch {ch.chapter_number}: {ch.title} ({ch.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Loading chapter questions from database...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-700">
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <HelpCircle size={40} color={c.primary} className="mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2" style={{ color: c.dark }}>
            No Questions Found for this Chapter
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            Questions have not yet been extracted from the PDF into the database for this chapter.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/admin/upload?tab=chapters"
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: c.primary, color: "#fff" }}
            >
              Go to PDF Auto-Processor
            </Link>
            <Link
              to="/tutor"
              className="px-4 py-2 rounded-lg text-xs font-bold border border-gray-300 text-gray-700"
            >
              Chat with AI Tutor
            </Link>
          </div>
        </div>
      ) : quizFinished ? (
        /* Quiz Finished Summary Screen */
        <div className="dashboard-card text-center py-10">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Trophy size={40} />
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
            Quiz Completed!
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            You answered <strong>{score}</strong> out of <strong>{questions.length}</strong> questions correctly (
            {Math.round((score / questions.length) * 100)}%).
          </p>

          <div className="max-w-md mx-auto mb-8">
            <Bar pct={(score / questions.length) * 100} color={score / questions.length >= 0.7 ? "#10b981" : c.primary} />
          </div>

          <div className="flex justify-center gap-3">
            <PrimaryButton onClick={handleRestartQuiz} className="flex items-center gap-2 text-sm">
              <RotateCcw size={16} /> Retake Quiz
            </PrimaryButton>

            <button
              onClick={() => navigate("/tutor")}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Ask AI Tutor for Review
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Screen */
        <div>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold mb-2" style={{ color: c.gray }}>
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{progressPct}% Completed</span>
            </div>
            <Bar pct={progressPct} color={c.primary} />
          </div>

          {/* Question Card */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <span className="app-badge app-badge-info uppercase text-[10px]">
                {currentQ.question_type === "mcq" ? "Multiple Choice" : "Short Answer"}
              </span>

              <span
                className={`app-badge ${
                  currentQ.difficulty === "easy"
                    ? "app-badge-success"
                    : currentQ.difficulty === "hard"
                    ? "app-badge-danger"
                    : "app-badge-warning"
                } uppercase text-[10px]`}
              >
                {currentQ.difficulty}
              </span>
            </div>

            <h2 className="text-lg font-bold mb-4" style={{ ...headingFont, color: c.dark }}>
              {currentQ.question_text}
            </h2>

            {/* MCQ Options */}
            {currentQ.question_type === "mcq" && currentQ.options && Array.isArray(currentQ.options) ? (
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedOption === opt.letter;
                  const isCorrect = opt.letter === currentQ.correct_answer;

                  let borderStyle = `2px solid ${c.lighterGray}`;
                  let bgStyle = c.white;

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      borderStyle = `2px solid #10b981`;
                      bgStyle = "#dcede6";
                    } else if (isSelected && !isCorrect) {
                      borderStyle = `2px solid #ef4444`;
                      bgStyle = "#fee2e2";
                    }
                  } else if (isSelected) {
                    borderStyle = `2px solid ${c.primary}`;
                    bgStyle = "#fff8eb";
                  }

                  return (
                    <div
                      key={opt.letter}
                      onClick={() => handleSelectOption(opt.letter)}
                      className="flex items-center gap-4 rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm"
                      style={{ border: borderStyle, background: bgStyle }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isAnswerSubmitted && isCorrect ? "#10b981" : isSelected ? c.primary : c.lighterGray,
                          color: isSelected || (isAnswerSubmitted && isCorrect) ? "#fff" : c.dark,
                        }}
                      >
                        {opt.letter}
                      </div>

                      <div className="flex-1 text-sm font-semibold" style={{ color: c.dark }}>
                        {opt.text}
                      </div>

                      {isAnswerSubmitted && isCorrect && <CheckCircle size={18} color="#10b981" />}
                      {isAnswerSubmitted && isSelected && !isCorrect && <XCircle size={18} color="#ef4444" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Short Answer display */
              <div className="mb-6">
                {isAnswerSubmitted ? (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900">
                    <strong>Model Answer:</strong> {currentQ.correct_answer}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Think of your answer, then click "Reveal Answer" to check your understanding.
                  </p>
                )}
              </div>
            )}

            {/* Explanation box on submit */}
            {isAnswerSubmitted && currentQ.explanation && (
              <div className="question-explanation-box mb-6 text-xs">
                💡 <strong>Explanation:</strong> {currentQ.explanation}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!isAnswerSubmitted ? (
                <PrimaryButton
                  onClick={currentQ.question_type === "mcq" ? handleCheckAnswer : () => setIsAnswerSubmitted(true)}
                  disabled={currentQ.question_type === "mcq" && !selectedOption}
                  className="flex-1 py-2.5 text-sm"
                >
                  {currentQ.question_type === "mcq" ? "Check Answer" : "Reveal Answer"}
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onClick={handleNextQuestion}
                  className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {currentIndex + 1 < questions.length ? (
                    <>
                      Next Question <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      Finish Quiz <Award size={16} />
                    </>
                  )}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
