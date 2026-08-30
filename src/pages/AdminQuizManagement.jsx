import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  BarChart2,
  Settings,
  HelpCircle,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ArrowLeft,
  List
} from "lucide-react";
import { Card, PrimaryButton } from "../components/UI";
import { get, post, put, del } from "../utils/api";
import { c, headingFont } from "../utils/theme";

export default function AdminQuizManagementPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Managing active modal/editor for a specific chapter/quiz
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeQuizModal, setActiveQuizModal] = useState(false); // false | 'config' | 'questions' | 'attempts'
  const [activeTab, setActiveTab] = useState("mcq"); // "mcq" | "written"

  // Forms State
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    time_limit_minutes: 45,
    passing_percentage: 60,
    marks_per_mcq: 1,
    marks_per_written: 10,
    max_attempts: 5,
    is_published: true,
  });

  // MCQ Add/Edit Form
  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [editingMcqId, setEditingMcqId] = useState(null);
  const [mcqForm, setMcqForm] = useState({
    question_text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct_answer: "A",
    explanation: "",
    difficulty: "medium",
  });

  // Written Add/Edit Form
  const [writtenModalOpen, setWrittenModalOpen] = useState(false);
  const [editingWrittenId, setEditingWrittenId] = useState(null);
  const [writtenForm, setWrittenForm] = useState({
    question_text: "",
    expected_answer: "",
    key_concepts: "",
    marking_criteria: "",
    min_words: 20,
    max_words: 300,
    marks: 10,
  });

  // Full Quiz Details for editing
  const [fullQuiz, setFullQuiz] = useState(null);
  const [attemptsList, setAttemptsList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // JSON Import Modal State
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);
  const [metaClass, setMetaClass] = useState("5");
  const [metaSubject, setMetaSubject] = useState("हिंदी");
  const [metaChapter, setMetaChapter] = useState("");
  const [targetChapterId, setTargetChapterId] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [isImportingJson, setIsImportingJson] = useState(false);

  // Dynamic fetch lists for JSON Importer dropdowns
  const [classList, setClassList] = useState([]);
  const [allSubjectsList, setAllSubjectsList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [chapterList, setChapterList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Derived subjects list: if class selected, filter by class, otherwise show all subjects
  const availableSubjects = selectedClassId
    ? (allSubjectsList.length ? allSubjectsList.filter((s) => String(s.class_id) === String(selectedClassId)) : subjectList)
    : (allSubjectsList.length ? allSubjectsList : subjectList);

  // Load Classes when Modal opens
  useEffect(() => {
    if (jsonImportModalOpen) {
      get("/admin/classes")
        .then((res) => setClassList(res.data || []))
        .catch(() => setClassList([]));
      get("/admin/subjects-list")
        .then((res) => setAllSubjectsList(res.subjects || res.data || []))
        .catch(() => setAllSubjectsList([]));
    }
  }, [jsonImportModalOpen]);

  // Load Subjects when selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      get(`/admin/classes/${selectedClassId}/subjects`)
        .then((res) => setSubjectList(res.data || []))
        .catch(() => setSubjectList([]));
    } else {
      setSubjectList([]);
    }
  }, [selectedClassId]);

  // Load Chapters when selectedSubjectId changes
  useEffect(() => {
    if (selectedSubjectId) {
      get(`/admin/subjects/${selectedSubjectId}/chapters`)
        .then((res) => setChapterList(res.data || []))
        .catch(() => setChapterList([]));
    } else {
      setChapterList([]);
    }
  }, [selectedSubjectId]);

  const openImportModalForChapter = (ch = null) => {
    if (ch) {
      setMetaClass(ch.class_name ? ch.class_name.replace(/Class\s*/i, "") : "5");
      setMetaSubject(ch.subject_name || "हिंदी");
      setMetaChapter(ch.chapter_title || "");
      setTargetChapterId(ch.chapter_id);
    } else {
      setMetaClass("5");
      setMetaSubject("हिंदी");
      setMetaChapter("");
      setTargetChapterId(null);
    }
    setSelectedClassId("");
    setSelectedSubjectId("");
    setJsonInput("");
    setJsonImportModalOpen(true);
  };

  const [parsedStats, setParsedStats] = useState(null);

  const handleJsonInputChange = (val) => {
    setJsonInput(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed.class) setMetaClass(String(parsed.class).replace(/Class\s*/i, ""));
      if (parsed.subject) setMetaSubject(parsed.subject);
      if (parsed.chapter) setMetaChapter(parsed.chapter);

      const mcqCount = Array.isArray(parsed.mcq) ? parsed.mcq.length : 0;
      const subjCount = Array.isArray(parsed.subjective) ? parsed.subjective.length : (Array.isArray(parsed.written) ? parsed.written.length : 0);

      if (mcqCount > 0 || subjCount > 0) {
        setParsedStats({ mcqCount, subjCount });
      } else {
        setParsedStats(null);
      }
    } catch {
      setParsedStats(null);
    }
  };

  const handleJsonImport = async (e) => {
    e.preventDefault();
    if (!jsonInput.trim()) return;

    setIsImportingJson(true);
    try {
      let parsed = JSON.parse(jsonInput);
      const payload = {
        chapter_id: targetChapterId,
        class: metaClass,
        subject: metaSubject,
        chapter: metaChapter,
        ...parsed,
      };

      const res = await post("/admin/quizzes/import-json", payload);
      alert(res.message || "Quiz questions imported successfully!");
      setJsonImportModalOpen(false);
      setJsonInput("");
      setParsedStats(null);
      await loadDashboard();

      if (res.data?.chapter_id) {
        const importedChapter = {
          chapter_id: res.data.chapter_id,
          chapter_number: 1,
          chapter_title: res.data.chapter_title || metaChapter || "Imported Chapter",
          class_name: `Class ${metaClass}`,
          subject_name: metaSubject,
        };
        await openManageQuiz(importedChapter, "questions");
      }
    } catch (err) {
      alert("Import failed: " + (err.message || "Invalid JSON payload format"));
    } finally {
      setIsImportingJson(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const res = await get("/admin/quizzes/dashboard");
      setDashboardData(res.data);
      get("/admin/classes")
        .then((cRes) => setClassList(cRes.data || []))
        .catch(() => setClassList([]));
      get("/admin/subjects-list")
        .then((sRes) => setAllSubjectsList(sRes.subjects || sRes.data || []))
        .catch(() => setAllSubjectsList([]));
    } catch (err) {
      console.error("Failed to load admin quiz dashboard:", err);
      setErrorMsg("Failed to load quiz dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function openManageQuiz(ch, initialModalTab = "questions") {
    setSelectedChapter(ch);
    setActiveQuizModal(initialModalTab);

    try {
      const res = await get(`/chapters/${ch.chapter_id}/quiz`);
      setFullQuiz(res.data);

      setQuizForm({
        title: res.data.quiz_title || `Chapter ${ch.chapter_number} Quiz`,
        description: res.data.description || "",
        time_limit_minutes: res.data.time_limit_minutes || 45,
        passing_percentage: res.data.passing_percentage || 60,
        marks_per_mcq: res.data.marks_per_mcq || 1,
        marks_per_written: res.data.marks_per_written || 10,
        max_attempts: 5,
        is_published: true,
      });
    } catch (err) {
      // If quiz doesn't exist yet, setup defaults
      setFullQuiz(null);
      setQuizForm({
        title: `Chapter ${ch.chapter_number} Quiz`,
        description: `Test your knowledge on ${ch.chapter_title}`,
        time_limit_minutes: 45,
        passing_percentage: 60,
        marks_per_mcq: 1,
        marks_per_written: 10,
        max_attempts: 5,
        is_published: true,
      });
    }
  }

  async function saveQuizConfig(e) {
    e.preventDefault();
    if (!selectedChapter) return;
    setIsSaving(true);
    try {
      await post(`/admin/chapters/${selectedChapter.chapter_id}/quiz-config`, quizForm);
      await loadDashboard();
      // Reload full quiz
      const res = await get(`/chapters/${selectedChapter.chapter_id}/quiz`);
      setFullQuiz(res.data);
      alert("Quiz configuration saved successfully!");
    } catch (err) {
      alert("Failed to save quiz config: " + (err.message || "Error"));
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublishState(quizId) {
    try {
      await post(`/admin/quizzes/${quizId}/toggle-publish`);
      await loadDashboard();
      if (selectedChapter) {
        openManageQuiz(selectedChapter);
      }
    } catch (err) {
      alert("Failed to toggle publish status");
    }
  }

  // Handle MCQ creation/editing
  const openAddMcq = () => {
    setEditingMcqId(null);
    setMcqForm({
      question_text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct_answer: "A",
      explanation: "",
      difficulty: "medium",
    });
    setMcqModalOpen(true);
  };

  const saveMcqQuestion = async (e) => {
    e.preventDefault();
    if (!fullQuiz?.quiz_id) {
      alert("Please save the quiz configuration first!");
      return;
    }

    const payload = {
      question_text: mcqForm.question_text,
      options: [
        { letter: "A", text: mcqForm.optionA },
        { letter: "B", text: mcqForm.optionB },
        { letter: "C", text: mcqForm.optionC },
        { letter: "D", text: mcqForm.optionD },
      ],
      correct_answer: mcqForm.correct_answer,
      explanation: mcqForm.explanation,
      difficulty: mcqForm.difficulty,
    };

    try {
      if (editingMcqId) {
        await put(`/admin/quizzes/mcq/${editingMcqId}`, payload);
      } else {
        await post(`/admin/quizzes/${fullQuiz.quiz_id}/mcq`, payload);
      }
      setMcqModalOpen(false);
      // Refresh
      const res = await get(`/chapters/${selectedChapter.chapter_id}/quiz`);
      setFullQuiz(res.data);
    } catch (err) {
      alert("Failed to save MCQ: " + err.message);
    }
  };

  const deleteMcqQuestion = async (qId) => {
    if (!confirm("Are you sure you want to delete this MCQ question?")) return;
    try {
      await del(`/admin/quizzes/mcq/${qId}`);
      const res = await get(`/chapters/${selectedChapter.chapter_id}/quiz`);
      setFullQuiz(res.data);
    } catch (err) {
      alert("Failed to delete MCQ");
    }
  };

  // Handle Written Question creation/editing
  const openAddWritten = () => {
    setEditingWrittenId(null);
    setWrittenForm({
      question_text: "",
      expected_answer: "",
      key_concepts: "",
      marking_criteria: "",
      min_words: 20,
      max_words: 300,
      marks: 10,
    });
    setWrittenModalOpen(true);
  };

  const saveWrittenQuestion = async (e) => {
    e.preventDefault();
    if (!fullQuiz?.quiz_id) {
      alert("Please save the quiz configuration first!");
      return;
    }

    const conceptsArr = writtenForm.key_concepts
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const payload = {
      question_text: writtenForm.question_text,
      expected_answer: writtenForm.expected_answer,
      key_concepts: conceptsArr,
      marking_criteria: writtenForm.marking_criteria,
      min_words: Number(writtenForm.min_words),
      max_words: Number(writtenForm.max_words),
      marks: Number(writtenForm.marks),
    };

    try {
      if (editingWrittenId) {
        await put(`/admin/quizzes/written/${editingWrittenId}`, payload);
      } else {
        await post(`/admin/quizzes/${fullQuiz.quiz_id}/written`, payload);
      }
      setWrittenModalOpen(false);
      const res = await get(`/chapters/${selectedChapter.chapter_id}/quiz`);
      setFullQuiz(res.data);
    } catch (err) {
      alert("Failed to save written question: " + err.message);
    }
  };

  const deleteWrittenQuestion = async (wId) => {
    if (!confirm("Are you sure you want to delete this written question?")) return;
    try {
      await del(`/admin/quizzes/written/${wId}`);
      const res = await get(`/chapters/${selectedChapter.chapter_id}/quiz`);
      setFullQuiz(res.data);
    } catch (err) {
      alert("Failed to delete written question");
    }
  };

  // View student attempts for a quiz
  const viewAttempts = async (quizId) => {
    setActiveQuizModal("attempts");
    try {
      const res = await get(`/admin/quizzes/${quizId}/attempts`);
      setAttemptsList(res.data || []);
    } catch (err) {
      console.error("Failed to load attempts:", err);
    }
  };

  const stats = dashboardData?.stats;

  return (
    <div className="max-w-6xl mx-auto py-4 px-2">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: c.primary }}>
            <FileCheck size={14} /> Administration Control
          </div>
          <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
            Quiz Management & Analytics
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openImportModalForChapter(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm flex items-center gap-1.5"
          >
            <Sparkles size={14} /> Import Quiz JSON
          </button>
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Admin Panel
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Loading quiz dashboard stats...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admin JSON Quiz Importer Section (Embedded Above Stats) */}
          <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
                  <Sparkles className="text-amber-500" size={20} /> Admin JSON Quiz Importer
                </h3>
                <p className="text-xs text-gray-500">
                  Select Class Level, Subject Name, Chapter Title or paste JSON questions (50 MCQ + 20 Subjective).
                </p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Direct Ingestion Panel
              </span>
            </div>

            <form onSubmit={handleJsonImport} className="space-y-4">
              {/* Step 1: Class, Subject, Chapter Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">1. Class Level</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    value={selectedClassId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedClassId(val);
                      const found = classList.find((c) => String(c.id) === String(val));
                      if (found) setMetaClass(found.name.replace(/Class\s*/i, ""));
                    }}
                  >
                    <option value="">-- Select Class --</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">2. Subject Name</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    value={selectedSubjectId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSubjectId(val);
                      const found = availableSubjects.find((s) => String(s.id) === String(val));
                      if (found) {
                        setMetaSubject(found.name);
                        if (found.class_id) setSelectedClassId(found.class_id);
                        if (found.class_name) setMetaClass(found.class_name.replace(/Class\s*/i, ""));
                      }
                    }}
                  >
                    <option value="">-- Select Subject --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.class_name ? `(${s.class_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">3. Chapter Title</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = chapterList.find((ch) => String(ch.id) === String(val));
                      if (found) {
                        setTargetChapterId(found.id);
                        setMetaChapter(found.name || found.title);
                      }
                    }}
                    disabled={!selectedSubjectId && chapterList.length === 0}
                  >
                    <option value="">-- Select Chapter --</option>
                    {chapterList.map((ch) => (
                      <option key={ch.id} value={ch.id}>Ch {ch.chapter_number || ""}: {ch.name || ch.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Questions Payload */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">4. Questions JSON Payload (MCQs + Subjective)</label>
                  {parsedStats ? (
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-xs">
                      ✓ Ready: {parsedStats.mcqCount} MCQs & {parsedStats.subjCount} Subjective Questions Detected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Paste JSON with "mcq" and "subjective" arrays
                    </span>
                  )}
                </div>
                <textarea
                  rows={6}
                  className="w-full text-xs font-mono p-3 bg-gray-900 text-emerald-400 rounded-xl border border-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder='{ "mcq": [ { "question": "...", "options": [...], "answer": "..." } ], "subjective": [ { "question": "...", "answer": "..." } ] }'
                  value={jsonInput}
                  onChange={(e) => handleJsonInputChange(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-xs text-gray-500 font-medium">Auto-creates class, subject & chapter if missing.</span>
                <PrimaryButton type="submit" disabled={isImportingJson} className="px-6 py-2 text-xs font-bold">
                  {isImportingJson ? "Importing Quiz Data..." : "Import Quiz JSON (50 MCQ + 20 Subjective)"}
                </PrimaryButton>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* MANAGE QUIZ MODAL */}
      {selectedChapter && activeQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase">
                  {selectedChapter.class_name} · {selectedChapter.subject_name}
                </span>
                <h2 className="text-xl font-extrabold text-gray-900" style={{ ...headingFont }}>
                  Manage Quiz: Chapter {selectedChapter.chapter_number} - {selectedChapter.chapter_title}
                </h2>
              </div>
              <button onClick={() => setSelectedChapter(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                ✕
              </button>
            </div>

            {/* Sub-navigation tabs inside modal */}
            <div className="flex border-b border-gray-200 text-sm font-bold gap-6">
              <button
                onClick={() => setActiveQuizModal("config")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeQuizModal === "config" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                1. Quiz Settings
              </button>
              <button
                onClick={() => setActiveQuizModal("questions")}
                className={`pb-2 border-b-2 transition-colors ${
                  activeQuizModal === "questions" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                2. Questions ({fullQuiz ? (fullQuiz.total_mcq + fullQuiz.total_written) : 0})
              </button>
              {fullQuiz && (
                <button
                  onClick={() => viewAttempts(fullQuiz.quiz_id)}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeQuizModal === "attempts" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  3. Student Attempts
                </button>
              )}
            </div>

            {/* TAB 1: CONFIG FORM */}
            {activeQuizModal === "config" && (
              <form onSubmit={saveQuizConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Quiz Title</label>
                    <input
                      type="text"
                      className="form-control text-sm"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Time Limit (Minutes)</label>
                    <input
                      type="number"
                      className="form-control text-sm"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Passing Percentage (%)</label>
                    <input
                      type="number"
                      className="form-control text-sm"
                      value={quizForm.passing_percentage}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_percentage: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Marks per MCQ</label>
                    <input
                      type="number"
                      className="form-control text-sm"
                      value={quizForm.marks_per_mcq}
                      onChange={(e) => setQuizForm({ ...quizForm, marks_per_mcq: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Marks per Written Question</label>
                    <input
                      type="number"
                      className="form-control text-sm"
                      value={quizForm.marks_per_written}
                      onChange={(e) => setQuizForm({ ...quizForm, marks_per_written: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Max Attempts Allowed</label>
                    <input
                      type="number"
                      className="form-control text-sm"
                      value={quizForm.max_attempts}
                      onChange={(e) => setQuizForm({ ...quizForm, max_attempts: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                  <PrimaryButton type="submit" disabled={isSaving} className="px-6 py-2 text-sm">
                    {isSaving ? "Saving..." : "Save Quiz Settings"}
                  </PrimaryButton>
                </div>
              </form>
            )}

            {/* TAB 2: QUESTIONS MANAGER (50 MCQs & 20 Written) */}
            {activeQuizModal === "questions" && (
              <div className="space-y-4">
                <div className="flex border-b border-gray-200 justify-between items-center pb-2">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setActiveTab("mcq")}
                      className={`text-sm font-bold pb-1 border-b-2 ${
                        activeTab === "mcq" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500"
                      }`}
                    >
                      MCQs ({fullQuiz?.mcq_questions?.length || 0} / 50)
                    </button>
                    <button
                      onClick={() => setActiveTab("written")}
                      className={`text-sm font-bold pb-1 border-b-2 ${
                        activeTab === "written" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500"
                      }`}
                    >
                      Written Questions ({fullQuiz?.written_questions?.length || 0} / 20)
                    </button>
                  </div>

                  {activeTab === "mcq" ? (
                    <button
                      onClick={openAddMcq}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add MCQ
                    </button>
                  ) : (
                    <button
                      onClick={openAddWritten}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Written Question
                    </button>
                  )}
                </div>

                {/* MCQs List */}
                {activeTab === "mcq" && (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {(fullQuiz?.mcq_questions || []).map((q, idx) => (
                      <div key={q.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-start">
                        <div className="space-y-1 pr-4">
                          <span className="font-extrabold text-amber-700">Q{idx + 1}.</span>
                          <span className="font-bold text-gray-900 ml-1">{q.question_text}</span>
                          <div className="grid grid-cols-2 gap-x-4 text-gray-600 font-medium pt-1">
                            {(q.options || []).map((opt) => (
                              <div key={opt.letter} className={opt.letter === q.correct_answer ? "text-emerald-700 font-bold" : ""}>
                                {opt.letter}. {opt.text} {opt.letter === q.correct_answer && "✓"}
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMcqQuestion(q.id)}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                          title="Delete MCQ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Written Questions List */}
                {activeTab === "written" && (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {(fullQuiz?.written_questions || []).map((wq, idx) => (
                      <div key={wq.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-start">
                        <div className="space-y-1 pr-4">
                          <span className="font-extrabold text-indigo-700">W{idx + 1}.</span>
                          <span className="font-bold text-gray-900 ml-1">{wq.question_text}</span>
                          <div className="text-gray-600 pt-1">
                            <strong className="text-indigo-900">Expected Answer:</strong>{" "}
                            <span className="text-gray-800 italic font-medium">
                              {wq.expected_answer || wq.answer || "(No expected answer set)"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteWrittenQuestion(wq.id)}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                          title="Delete Written Question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STUDENT ATTEMPTS & EXPORT */}
            {activeQuizModal === "attempts" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-800">Student Attempts ({attemptsList.length})</h4>
                  {fullQuiz && (
                    <a
                      href={`/api/admin/quizzes/${fullQuiz.quiz_id}/export`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <Download size={14} /> Export Results (CSV)
                    </a>
                  )}
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">MCQ Score</th>
                        <th className="p-3">Written Score</th>
                        <th className="p-3">Total Score</th>
                        <th className="p-3">Percentage</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {attemptsList.map((att) => (
                        <tr key={att.id}>
                          <td className="p-3 font-bold text-gray-900">{att.student?.name || "Student"}</td>
                          <td className="p-3">{att.mcq_score}</td>
                          <td className="p-3">{att.written_score}</td>
                          <td className="p-3 font-bold">{att.total_score} / {att.max_score}</td>
                          <td className="p-3 font-extrabold text-amber-600">{att.percentage}%</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${att.is_passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {att.is_passed ? "Passed" : "Failed"}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">{new Date(att.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD MCQ MODAL */}
      {mcqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add New MCQ Question</h3>
            <form onSubmit={saveMcqQuestion} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Question Text</label>
                <textarea
                  rows={2}
                  className="form-control text-xs"
                  value={mcqForm.question_text}
                  onChange={(e) => setMcqForm({ ...mcqForm, question_text: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Option A</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={mcqForm.optionA}
                    onChange={(e) => setMcqForm({ ...mcqForm, optionA: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Option B</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={mcqForm.optionB}
                    onChange={(e) => setMcqForm({ ...mcqForm, optionB: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Option C</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={mcqForm.optionC}
                    onChange={(e) => setMcqForm({ ...mcqForm, optionC: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Option D</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={mcqForm.optionD}
                    onChange={(e) => setMcqForm({ ...mcqForm, optionD: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Correct Answer</label>
                  <select
                    className="form-control text-xs font-bold"
                    value={mcqForm.correct_answer}
                    onChange={(e) => setMcqForm({ ...mcqForm, correct_answer: e.target.value })}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Difficulty</label>
                  <select
                    className="form-control text-xs"
                    value={mcqForm.difficulty}
                    onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Explanation (Optional)</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={mcqForm.explanation}
                  onChange={(e) => setMcqForm({ ...mcqForm, explanation: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMcqModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <PrimaryButton type="submit" className="px-5 py-2 text-xs">
                  Save MCQ
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD WRITTEN QUESTION MODAL */}
      {writtenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Add Written Question</h3>
            <form onSubmit={saveWrittenQuestion} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Question Text</label>
                <textarea
                  rows={2}
                  className="form-control text-xs"
                  value={writtenForm.question_text}
                  onChange={(e) => setWrittenForm({ ...writtenForm, question_text: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Model / Expected Answer</label>
                <textarea
                  rows={3}
                  className="form-control text-xs"
                  value={writtenForm.expected_answer}
                  onChange={(e) => setWrittenForm({ ...writtenForm, expected_answer: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Key Concepts (Comma-separated)</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="photosynthesis, sunlight, chlorophyll"
                  value={writtenForm.key_concepts}
                  onChange={(e) => setWrittenForm({ ...writtenForm, key_concepts: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Min Words</label>
                  <input
                    type="number"
                    className="form-control text-xs"
                    value={writtenForm.min_words}
                    onChange={(e) => setWrittenForm({ ...writtenForm, min_words: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Max Words</label>
                  <input
                    type="number"
                    className="form-control text-xs"
                    value={writtenForm.max_words}
                    onChange={(e) => setWrittenForm({ ...writtenForm, max_words: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setWrittenModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <PrimaryButton type="submit" className="px-5 py-2 text-xs">
                  Save Written Question
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON IMPORT MODAL */}
      {jsonImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ ...headingFont }}>
                  <Sparkles className="text-amber-500" size={18} /> Admin JSON Quiz Importer
                </h3>
                <p className="text-xs text-gray-500">Paste chapter quiz JSON payload (with 50 MCQs & 20 Subjective questions)</p>
              </div>
              <button onClick={() => setJsonImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleJsonImport} className="space-y-4">
              {/* Step 1: Class, Subject, Chapter Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">1. Class Level</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    value={selectedClassId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedClassId(val);
                      const found = classList.find((c) => String(c.id) === String(val));
                      if (found) setMetaClass(found.name.replace(/Class\s*/i, ""));
                    }}
                  >
                    <option value="">-- Select Class --</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">2. Subject Name</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    value={selectedSubjectId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSubjectId(val);
                      const found = availableSubjects.find((s) => String(s.id) === String(val));
                      if (found) {
                        setMetaSubject(found.name);
                        if (found.class_id) setSelectedClassId(found.class_id);
                        if (found.class_name) setMetaClass(found.class_name.replace(/Class\s*/i, ""));
                      }
                    }}
                  >
                    <option value="">-- Select Subject --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.class_name ? `(${s.class_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">3. Chapter Title</label>
                  <select
                    className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-gray-300 mb-1.5 focus:ring-2 focus:ring-amber-500"
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = chapterList.find((ch) => String(ch.id) === String(val));
                      if (found) {
                        setTargetChapterId(found.id);
                        setMetaChapter(found.name || found.title);
                      }
                    }}
                    disabled={!selectedSubjectId && chapterList.length === 0}
                  >
                    <option value="">-- Select Chapter --</option>
                    {chapterList.map((ch) => (
                      <option key={ch.id} value={ch.id}>Ch {ch.chapter_number || ""}: {ch.name || ch.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Questions Payload */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">4. Questions JSON Payload (50 MCQ + 20 Written)</label>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Auto-fills from JSON</span>
                </div>
                <textarea
                  rows={10}
                  className="w-full text-xs font-mono p-3 bg-gray-900 text-emerald-400 rounded-xl border border-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder='{ "mcq": [ { "question": "...", "options": [...], "answer": "..." } ], "subjective": [ { "question": "...", "answer": "..." } ] }'
                  value={jsonInput}
                  onChange={(e) => handleJsonInputChange(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-gray-500 font-medium">Auto-creates class, subject & chapter if missing.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setJsonImportModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <PrimaryButton type="submit" disabled={isImportingJson} className="px-5 py-2 text-xs">
                    {isImportingJson ? "Importing..." : "Import Quiz JSON"}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
