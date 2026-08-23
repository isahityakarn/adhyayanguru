import { useEffect, useState } from "react";
import { TrendingUp, Award, Calendar, CheckCircle2, Clock, BookOpen, RefreshCw } from "lucide-react";
import { Card, Bar } from "../components/UI";
import { c, headingFont } from "../utils/theme";
import { get } from "../utils/api";

export default function ParentDashboardPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      let data = null;
      try {
        data = await get("/progress/parent-report");
      } catch (e1) {
        data = await get("/progress/summary");
      }
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load parent report. Please ensure backend migration and routes are deployed on server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const studentName = report?.student?.name || "Student";
  const summary = report?.summary || {};
  const chapters = report?.chapters || [];

  const stats = [
    { icon: Clock, num: summary.formatted_total_time_spent || "0s", lbl: "Total Chapter Study Time", color: c.primary },
    { icon: BookOpen, num: String(summary.total_chapters_started || 0), lbl: "Chapters Started", color: c.accent },
    { icon: CheckCircle2, num: String(summary.total_chapters_completed || 0), lbl: "Chapters Completed", color: "#059669" },
    { icon: Calendar, num: `${chapters.length} total`, lbl: "Tracked Chapters", color: c.secondary },
  ];

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: c.primary }}>
            Parent & Student Activity Dashboard
          </div>
          <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
            {studentName}'s Chapter Progress Report
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchReport}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition"
            style={{ background: "#ffffff", color: c.dark }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <div className="px-4 py-2 rounded-lg" style={{ background: c.primaryBg }}>
            <div className="text-xs font-semibold" style={{ color: c.gray }}>Account Role</div>
            <div className="text-sm font-bold capitalize" style={{ color: c.primaryDark }}>
              {report?.student?.role || "Student"} Profile
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.lbl}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${s.color}18` }}
              >
                <Icon size={20} color={s.color} />
              </div>
              <div className="text-2xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
                {s.num}
              </div>
              <div className="text-xs font-medium" style={{ color: c.gray }}>
                {s.lbl}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Chapter Activity Section */}
      <Card className="mb-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h2 className="text-lg font-bold" style={{ ...headingFont, color: c.dark }}>
            Chapter Wise Time Spent & Completion Record
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Real-time recorded duration per chapter
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Loading student chapter progress...
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No chapter study time recorded yet. Select a chapter in AI Tutor to start studying!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Chapter</th>
                  <th className="py-3 px-4">Time Spent</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Completion %</th>
                  <th className="py-3 px-4">Last Studied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chapters.map((ch) => (
                  <tr key={ch.id || ch.chapter_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {ch.subject_name}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {ch.chapter_number ? `${ch.chapter_number}. ` : ""}{ch.chapter_title}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ⏱️ {ch.formatted_time_spent}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                        style={{
                          background: ch.status === "completed" ? "#dcfce7" : "#ffedd5",
                          color: ch.status === "completed" ? "#15803d" : "#c2410c",
                        }}
                      >
                        {ch.status === "completed" ? "✓ Completed" : ch.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-full">
                          <Bar pct={ch.percent_complete} color={ch.status === "completed" ? "#059669" : c.primary} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{ch.percent_complete}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {ch.last_accessed_at ? new Date(ch.last_accessed_at).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
