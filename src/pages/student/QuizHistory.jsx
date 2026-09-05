import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { History, Trophy, BookOpen, CheckCircle, XCircle, ArrowRight, Eye, Sparkles, Loader2 } from "lucide-react";
import { Card, PrimaryButton } from "../../components/UI";
import { get } from "../../utils/api";
import { c, headingFont } from "../../utils/theme";

export default function QuizHistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [resultDetail, setResultDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const res = await get("/quiz-attempts/history");
      setAttempts(res.data || []);
    } catch (err) {
      console.error("Failed to load attempt history:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function viewAttemptResult(attemptId) {
    setDetailLoading(true);
    try {
      const res = await get(`/quiz-attempts/${attemptId}/result`);
      setResultDetail(res.data);
      setSelectedAttempt(attemptId);
    } catch (err) {
      console.error("Failed to fetch result detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-4 px-2">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: c.primary }}>
            <History size={14} /> Student Records
          </div>
          <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
            My Quiz History
          </h1>
        </div>

        <Link
          to="/chapters"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5"
        >
          <BookOpen size={14} /> Go to Chapters
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Loading quiz attempt history...</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Trophy size={48} className="mx-auto mb-3 text-amber-400" />
          <h3 className="text-xl font-bold mb-2 text-gray-900" style={{ ...headingFont }}>
            No Quiz Attempts Yet
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Complete a chapter to unlock its quiz and test your knowledge with 50 MCQs and 20 written questions.
          </p>
          <Link
            to="/chapters"
            className="px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md inline-flex items-center gap-2"
            style={{ background: c.primary }}
          >
            Browse Chapters <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="dashboard-card overflow-hidden p-0 border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-extrabold border-b border-gray-200 text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Chapter</th>
                  <th className="py-3.5 px-4 text-center">Attempt</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-center">Result</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">Ch {att.chapter_number}: {att.chapter_title}</div>
                      <div className="text-xs text-gray-500">{att.class_name} · {att.subject_name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">#{att.attempt_number}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {att.total_score} / {att.max_score}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-amber-600">
                      {att.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                          att.status === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {att.status === "passed" ? "✅ Passed" : "📚 Keep Practicing"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 font-semibold">
                      {new Date(att.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => viewAttemptResult(att.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1 mx-auto"
                      >
                        <Eye size={13} /> View Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {selectedAttempt && resultDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-extrabold text-gray-900" style={{ ...headingFont }}>
                Quiz Attempt #{resultDetail.attempt_id} Result
              </h3>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">MCQ Score</span>
                <span className="text-lg font-extrabold text-amber-600">{resultDetail.mcq.score} / {resultDetail.mcq.max_score}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Written Score</span>
                <span className="text-lg font-extrabold text-indigo-600">{resultDetail.written.score} / {resultDetail.written.max_score}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Score</span>
                <span className="text-lg font-extrabold text-gray-900">{resultDetail.total_score} / {resultDetail.max_score}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Percentage</span>
                <span className="text-lg font-extrabold text-emerald-600">{resultDetail.percentage}%</span>
              </div>
            </div>

            {/* AI Written Feedback Summaries */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" /> AI Written Feedback
              </h4>
              {(resultDetail.detailed_written || []).map((wq, i) => (
                <div key={wq.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="font-bold text-gray-900">W{i+1}: {wq.question_text}</div>
                  <div className="text-gray-700"><strong>Score:</strong> {wq.score} / {wq.max_score}</div>
                  <div className="text-amber-950"><strong>Feedback:</strong> {wq.feedback}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2 text-sm font-bold bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
