import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  List,
  Search,
  Eye,
  Plus,
  Trash2,
  Edit,
  HelpCircle,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Brain,
  Sliders,
  Filter,
  Play,
  FileCheck,
  AlertTriangle,
  FolderPlus,
  Library
} from "lucide-react";
import { Input, PrimaryButton, Select } from "../components/UI";
import { get, post, del, put } from "../utils/api";
import { c, headingFont, displayFont } from "../utils/theme";

export default function AdminUploadPage({ initialTab, embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active tab: 'upload' | 'chapters' | 'subjects' | 'questions' | 'batch'
  const [activeTab, setActiveTab] = useState(initialTab || searchParams.get("tab") || "upload");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Initial reference data
  const [classes, setClasses] = useState([]);
  const [boards, setBoards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    total_chapters: 0,
    chapters_with_pdf: 0,
    chapters_processed: 0,
    unprocessed_chapters: 0,
    total_questions: 0,
    mcq_questions: 0,
    short_answer_questions: 0,
    difficulty_breakdown: { easy: 0, medium: 0, hard: 0 },
    total_classes: 0,
    total_subjects: 0,
  });

  // Upload Form State
  const [selectedClass, setSelectedClass] = useState(
    () => localStorage.getItem("last_admin_upload_class_id") || ""
  );
  const [selectedSubject, setSelectedSubject] = useState(
    () => localStorage.getItem("last_admin_upload_subject_id") || ""
  );
  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Upload Pipeline State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0); // 0: idle, 1: upload, 2: extract, 3: ai_generate, 4: saving, 5: done
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Chapters list state
  const [chapters, setChapters] = useState([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'processed' | 'unprocessed'

  // Subjects management state
  const [allSubjects, setAllSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [filterSubClass, setFilterSubClass] = useState("");
  const [filterSubBoard, setFilterSubBoard] = useState("");
  const [newSubjectModalOpen, setNewSubjectModalOpen] = useState(false);
  const [isQuickSubjectModal, setIsQuickSubjectModal] = useState(false);
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState("");
  const [newSubjectData, setNewSubjectData] = useState({
    name: "",
    class_id: "",
    board_id: "1",
  });
  const [editingSubject, setEditingSubject] = useState(null);

  // Questions bank state
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [filterQChapter, setFilterQChapter] = useState("");
  const [filterQType, setFilterQType] = useState("all");
  const [filterQDifficulty, setFilterQDifficulty] = useState("all");

  // Modal / Drawer state for inspecting chapter
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedChapter, setInspectedChapter] = useState(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);
  const [inspectActiveTab, setInspectActiveTab] = useState("content"); // 'content' | 'questions' | 'pages' | 'pdf'
  const [copiedText, setCopiedText] = useState(false);

  // Reprocess state per chapter
  const [reprocessingId, setReprocessingId] = useState(null);

  // Add Question Modal state
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);
  const [newQuestionData, setNewQuestionData] = useState({
    chapter_id: "",
    question_text: "",
    question_type: "mcq",
    difficulty: "medium",
    correct_answer: "A",
    options: [
      { letter: "A", text: "" },
      { letter: "B", text: "" },
      { letter: "C", text: "" },
      { letter: "D", text: "" },
    ],
  });

  // Batch Processor state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchLimit, setBatchLimit] = useState(3);
  const [batchResults, setBatchResults] = useState([]);
  const [batchMessage, setBatchMessage] = useState("");

  // Update URL param on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    if (tab === "chapters") {
      loadChapters();
    } else if (tab === "subjects") {
      loadAllSubjects();
    } else if (tab === "questions") {
      loadQuestions();
    } else if (tab === "upload") {
      loadStats();
    }
  };

  // When class changes in upload form, reload subjects
  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("last_admin_upload_class_id", selectedClass);
      loadSubjectsForClass(selectedClass);
    } else {
      setSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem("last_admin_upload_subject_id", selectedSubject);
    }
  }, [selectedSubject]);

  // Load Initial Data
  async function loadInitialData() {
    try {
      const response = await get("/admin/upload");
      const fetchedClasses = response.classes || [];
      setClasses(fetchedClasses);
      setBoards(response.boards || [{ id: 1, name: "CBSE" }, { id: 2, name: "ICSE" }]);

      const savedClassId = localStorage.getItem("last_admin_upload_class_id");
      if (savedClassId && fetchedClasses.some((c) => String(c.id) === String(savedClassId))) {
        setSelectedClass(String(savedClassId));
      } else if (fetchedClasses.length > 0 && !selectedClass) {
        setSelectedClass(String(fetchedClasses[0].id));
      }
    } catch (error) {
      console.error("Failed to load initial upload data:", error);
    }
  }

  // Load Stats
  async function loadStats() {
    try {
      const response = await get("/admin/stats");
      setStats(response);
    } catch (error) {
      console.error("Failed to load admin stats:", error);
    }
  }

  // Load Subjects for specific class
  async function loadSubjectsForClass(classId) {
    try {
      const response = await get(`/admin/subjects?class_id=${classId}`);
      const fetchedSubjects = response.subjects || [];
      setSubjects(fetchedSubjects);

      const savedSubjectId = localStorage.getItem("last_admin_upload_subject_id");
      if (savedSubjectId && fetchedSubjects.some((s) => String(s.id) === String(savedSubjectId))) {
        setSelectedSubject(String(savedSubjectId));
      } else if (fetchedSubjects.length > 0) {
        if (!fetchedSubjects.some((s) => String(s.id) === String(selectedSubject))) {
          setSelectedSubject(String(fetchedSubjects[0].id));
        }
      } else {
        setSelectedSubject("");
      }
    } catch (error) {
      console.error("Failed to load subjects for class:", error);
    }
  }

  // Load All Subjects for Subjects Tab
  const loadAllSubjects = useCallback(async function loadAllSubjects() {
    setIsLoadingSubjects(true);
    try {
      const params = new URLSearchParams();
      if (filterSubClass) params.append("class_id", filterSubClass);
      if (filterSubBoard) params.append("board_id", filterSubBoard);
      if (subjectSearch) params.append("search", subjectSearch);

      const response = await get(`/admin/subjects-list?${params.toString()}`);
      setAllSubjects(response.subjects || []);
    } catch (error) {
      console.error("Failed to load all subjects:", error);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [filterSubClass, filterSubBoard, subjectSearch]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadStats();
    if (activeTab === "subjects") {
      loadAllSubjects();
    }
  }, [activeTab, loadAllSubjects]);

  // Handle Create Subject (either from modal or quick-add)
  async function handleSaveSubject(e) {
    e.preventDefault();
    const missing = [];
    if (!newSubjectData.name.trim()) missing.push("Subject Name");
    if (!newSubjectData.class_id) missing.push("Class Level");

    if (missing.length > 0) {
      setSubjectFormError(`Validation failed: The following field(s) are required: ${missing.join(", ")}.`);
      return;
    }

    setIsSubmittingSubject(true);
    setSubjectFormError("");

    try {
      if (editingSubject) {
        // Edit mode
        await put(`/admin/subjects/${editingSubject.id}`, {
          name: newSubjectData.name.trim(),
          class_id: newSubjectData.class_id,
          board_id: newSubjectData.board_id || 1,
        });
        alert(`Subject '${newSubjectData.name}' updated successfully!`);
      } else {
        // Create mode
        const response = await post("/admin/subjects", {
          name: newSubjectData.name.trim(),
          class_id: newSubjectData.class_id,
          board_id: newSubjectData.board_id || 1,
        });

        // If quick-add in upload form, select this newly created subject!
        if (isQuickSubjectModal) {
          if (selectedClass === String(newSubjectData.class_id)) {
            await loadSubjectsForClass(selectedClass);
            setSelectedSubject(response.subject.id);
          } else {
            setSelectedClass(String(newSubjectData.class_id));
            await loadSubjectsForClass(newSubjectData.class_id);
            setSelectedSubject(response.subject.id);
          }
        }
      }

      setNewSubjectModalOpen(false);
      setEditingSubject(null);
      setNewSubjectData({ name: "", class_id: "", board_id: "1" });
      loadAllSubjects();
      loadStats();
      if (selectedClass) loadSubjectsForClass(selectedClass);
    } catch (error) {
      let detailedError = "";
      if (error.errors && Object.keys(error.errors).length > 0) {
        detailedError = Object.values(error.errors).flat().join(" ");
      } else {
        detailedError = error.message || "Failed to save subject.";
      }
      setSubjectFormError(detailedError);
    } finally {
      setIsSubmittingSubject(false);
    }
  }

  // Handle Delete Subject
  async function handleDeleteSubject(subjectId, subjectName, chaptersCount) {
    const confirmMsg = chaptersCount > 0
      ? `Warning: Subject '${subjectName}' has ${chaptersCount} chapter(s) linked to it. Are you sure you want to force-delete it?`
      : `Are you sure you want to delete subject '${subjectName}'?`;

    if (!confirm(confirmMsg)) return;

    try {
      await del(`/admin/subjects/${subjectId}${chaptersCount > 0 ? "?force=1" : ""}`);
      alert(`Subject '${subjectName}' deleted successfully.`);
      loadAllSubjects();
      loadStats();
      if (selectedClass) loadSubjectsForClass(selectedClass);
    } catch (error) {
      alert(`Failed to delete subject: ${error.message}`);
    }
  }

  // Load Chapters with filters
  async function loadChapters() {
    setIsLoadingChapters(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append("class_id", filterClass);
      if (filterSubject) params.append("subject_id", filterSubject);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (chapterSearch) params.append("search", chapterSearch);

      const response = await get(`/admin/chapters?${params.toString()}`);
      setChapters(response.chapters || []);
    } catch (error) {
      console.error("Failed to load chapters:", error);
    } finally {
      setIsLoadingChapters(false);
    }
  }

  // Load Questions Bank
  async function loadQuestions() {
    setIsLoadingQuestions(true);
    try {
      const params = new URLSearchParams();
      if (filterQChapter) params.append("chapter_id", filterQChapter);
      if (filterQType && filterQType !== "all") params.append("question_type", filterQType);
      if (filterQDifficulty && filterQDifficulty !== "all") params.append("difficulty", filterQDifficulty);
      if (questionSearch) params.append("search", questionSearch);

      const response = await get(`/admin/questions?${params.toString()}`);
      setQuestions(response.data || []);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(`Selected file size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed limit of 15 MB. Please choose a smaller PDF.`);
      return;
    }
    setPdfFile(file);
    setUploadError("");

    // Auto-detect and suggest clean title if currently empty
    if (!title) {
      const cleanName = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/^[a-z0-9]+\s*/i, (match) => {
          return match.length > 5 ? "" : match;
        })
        .trim();
      if (cleanName) {
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  // Handle Main PDF Upload & Ingestion
  async function handleUpload(e) {
    e.preventDefault();
    const missing = [];
    if (!selectedClass) missing.push("Class Level");
    if (!selectedSubject) missing.push("Subject");
    if (!chapterNumber) missing.push("Chapter Number");
    if (!title.trim()) missing.push("Title");
    if (!pdfFile) missing.push("PDF File");

    if (missing.length > 0) {
      setUploadError(`Validation failed: The following field(s) are required: ${missing.join(", ")}.`);
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    setUploadStage(1); // Uploading

    const stageTimer1 = setTimeout(() => setUploadStage(2), 1200); // Extracting
    const stageTimer2 = setTimeout(() => setUploadStage(3), 2800); // AI Generating
    const stageTimer3 = setTimeout(() => setUploadStage(4), 5500); // Saving to DB

    try {
      // Convert file to base64 to ensure upload succeeds regardless of PHP INI limits
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      const formData = new FormData();
      formData.append("class_id", selectedClass);
      formData.append("subject_id", selectedSubject);
      formData.append("chapter_number", chapterNumber);
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("pdf_file", pdfFile);
      formData.append("pdf_base64", base64Data);
      formData.append("pdf_name", pdfFile.name);
      formData.append("question_count", questionCount);
      formData.append("difficulty", difficulty);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/admin/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("studyyodha_token")}`,
            Accept: "application/json",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let detailedError = "";
        if (errorData?.errors && Object.keys(errorData.errors).length > 0) {
          detailedError = Object.values(errorData.errors).flat().join(" ");
        } else {
          detailedError = errorData?.message || `Upload failed with status ${response.status}`;
        }
        throw new Error(detailedError);
      }

      const result = await response.json();
      setUploadStage(5); // Complete!
      setUploadResult(result.chapter);

      loadStats();

      // Reset form
      setChapterNumber("");
      setTitle("");
      setDescription("");
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload and process PDF chapter.");
      setUploadStage(0);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsUploading(false);
    }
  }

  // Handle Reprocess Chapter
  async function handleReprocess(chapterId) {
    setReprocessingId(chapterId);
    try {
      const response = await post(`/admin/chapters/${chapterId}/reprocess`);
      alert(`Success! Extracted ${response.chapter.text_length} characters and saved ${response.chapter.questions_count} questions into the database.`);
      loadChapters();
      loadStats();
      if (inspectedChapter && inspectedChapter.id === chapterId) {
        openInspectModal(chapterId);
      }
    } catch (error) {
      alert(`Failed to reprocess: ${error.message}`);
    } finally {
      setReprocessingId(null);
    }
  }

  // Handle Generate More Questions
  async function handleGenerateMoreQuestions(chapterId) {
    const countStr = prompt("How many additional questions would you like to generate and add to DB?", "4");
    if (!countStr) return;
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      alert("Please enter a valid number between 1 and 10.");
      return;
    }

    setReprocessingId(chapterId);
    try {
      const response = await post(`/admin/chapters/${chapterId}/generate-questions`, {
        count,
        difficulty: "mixed",
        replace_existing: false,
      });
      alert(`Success! Generated ${response.new_questions_count} new questions. Total in DB: ${response.total_questions_count}`);
      loadChapters();
      loadStats();
      if (inspectedChapter && inspectedChapter.id === chapterId) {
        openInspectModal(chapterId);
      }
    } catch (error) {
      alert(`Error generating questions: ${error.message}`);
    } finally {
      setReprocessingId(null);
    }
  }

  // Inspect Chapter Modal
  async function openInspectModal(chapterId) {
    setIsLoadingInspect(true);
    setInspectModalOpen(true);
    try {
      const response = await get(`/admin/chapters/${chapterId}`);
      setInspectedChapter(response.chapter);
    } catch (error) {
      alert(`Failed to load chapter details: ${error.message}`);
      setInspectModalOpen(false);
    } finally {
      setIsLoadingInspect(false);
    }
  }

  // Delete Chapter
  async function handleDeleteChapter(chapterId, chapterTitle) {
    if (!confirm(`Are you sure you want to delete chapter "${chapterTitle}" and all its extracted text and questions from database?`)) {
      return;
    }
    try {
      await del(`/admin/chapters/${chapterId}`);
      alert("Chapter and related records deleted successfully.");
      loadChapters();
      loadStats();
      if (inspectModalOpen) setInspectModalOpen(false);
    } catch (error) {
      alert(`Failed to delete chapter: ${error.message}`);
    }
  }

  // Batch Process Unprocessed Chapters
  async function handleRunBatch() {
    setIsBatchProcessing(true);
    setBatchMessage("Processing batch of chapters with Gemini AI...");
    try {
      const response = await post("/admin/batch-process", { limit: batchLimit });
      setBatchResults(response.processed || []);
      setBatchMessage(response.message);
      loadStats();
      loadChapters();
    } catch (error) {
      setBatchMessage(`Batch failed: ${error.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  }

  // Delete Question from DB
  async function handleDeleteQuestion(questionId) {
    if (!confirm("Are you sure you want to delete this question from the database?")) return;
    try {
      await del(`/admin/questions/${questionId}`);
      loadQuestions();
      loadStats();
      if (inspectedChapter) {
        openInspectModal(inspectedChapter.id);
      }
    } catch (error) {
      alert(`Failed to delete question: ${error.message}`);
    }
  }

  // Copy Extracted Text
  const handleCopyText = () => {
    if (!inspectedChapter?.extracted_text) return;
    navigator.clipboard.writeText(inspectedChapter.extracted_text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Hero / Header */}
      <div className="dashboard-hero">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.primary }}>
            AI Content Ingestion & Curriculum Engine
          </div>
          <h1 className="text-3xl font-bold" style={{ ...headingFont, color: c.dark }}>
            PDF Chapter, Subject & Question Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: c.gray }}>
            Insert subjects, upload textbook PDFs, automatically extract text, and synthesize practice questions directly into the database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsQuickSubjectModal(false);
              setEditingSubject(null);
              setNewSubjectData({ name: "", class_id: classes[0]?.id || "", board_id: "1" });
              setNewSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-md bg-white border border-amber-300 text-amber-900"
          >
            <FolderPlus size={16} color={c.primary} />
            + Insert Subject
          </button>

          <button
            onClick={() => handleTabChange("upload")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-md"
            style={{ background: c.primary, color: "#fff" }}
          >
            <Upload size={16} />
            Upload PDF
          </button>

          <button
            onClick={loadStats}
            className="action-icon-btn"
            title="Refresh Stats"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* High Level Stats Grid */}
      <div className="dashboard-stat-grid">
        <div className="stat-metric-card">
          <div className="stat-metric-icon" style={{ background: "#fef3c7", color: "#b45309" }}>
            <Library size={24} />
          </div>
          <div>
            <div className="stat-metric-value">{stats.total_subjects}</div>
            <div className="stat-metric-label">Subjects in Database</div>
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-metric-icon" style={{ background: "#fff0d4", color: "#c87812" }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-metric-value">{stats.total_chapters}</div>
            <div className="stat-metric-label">Total Chapters in DB</div>
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-metric-icon" style={{ background: "#dcede6", color: "#306a5a" }}>
            <FileCheck size={24} />
          </div>
          <div>
            <div className="stat-metric-value">{stats.chapters_processed}</div>
            <div className="stat-metric-label">Extracted Content Ready</div>
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-metric-icon" style={{ background: "#e8eaff", color: "#3d49ad" }}>
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="stat-metric-value">{stats.total_questions}</div>
            <div className="stat-metric-label">Questions Stored in DB</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="dashboard-tabs-bar">
        <button
          className={`dashboard-tab-btn ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => handleTabChange("upload")}
        >
          <Upload size={16} />
          <span>Upload & Auto-Process</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === "subjects" ? "active" : ""}`}
          onClick={() => handleTabChange("subjects")}
        >
          <Library size={16} />
          <span>Subjects & Curriculum</span>
          <span className="dashboard-tab-count">{stats.total_subjects}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === "chapters" ? "active" : ""}`}
          onClick={() => handleTabChange("chapters")}
        >
          <BookOpen size={16} />
          <span>Chapters & Content Repository</span>
          <span className="dashboard-tab-count">{stats.total_chapters}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === "questions" ? "active" : ""}`}
          onClick={() => handleTabChange("questions")}
        >
          <HelpCircle size={16} />
          <span>Question Bank (DB)</span>
          <span className="dashboard-tab-count">{stats.total_questions}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === "batch" ? "active" : ""}`}
          onClick={() => handleTabChange("batch")}
        >
          <Sparkles size={16} />
          <span>Batch Auto-Processor</span>
          {stats.unprocessed_chapters > 0 && (
            <span className="dashboard-tab-count" style={{ background: "#fee2e2", color: "#b91c1c" }}>
              {stats.unprocessed_chapters}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: UPLOAD & AUTO PROCESS PDF
          ========================================================================= */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Upload Form */}
          <div className="lg:col-span-8">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                    Upload Chapter PDF
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Extracts text and generates multiple choice & comprehension questions in database
                  </p>
                </div>
                <span className="app-badge app-badge-info">
                  <Brain size={13} /> Gemini 3.5 Flash Active
                </span>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Class & Subject row with + Quick Add Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.darkGray }}>
                      Class Level *
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="form-control"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.darkGray }}>
                        Subject *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickSubjectModal(true);
                          setEditingSubject(null);
                          setNewSubjectData({
                            name: "",
                            class_id: selectedClass || classes[0]?.id || "",
                            board_id: "1",
                          });
                          setNewSubjectModalOpen(true);
                        }}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> + Insert New Subject
                      </button>
                    </div>

                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="form-control"
                      disabled={!selectedClass}
                      required
                    >
                      <option value="">
                        {selectedClass ? "Select Subject" : "Select Class First"}
                      </option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chapter Number & Title */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.darkGray }}>
                      Chapter No. *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 1"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.darkGray }}>
                      Chapter Title *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Papa's Spectacles or Force & Motion"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>



                {/* AI Configuration Preferences */}
                <div className="p-4 rounded-xl" style={{ background: "#faf8f2", border: "1px solid #e8e4da" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} color={c.primary} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.dark }}>
                      AI Question Generation Settings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: c.gray }}>
                        Questions to Generate in DB
                      </label>
                      <select
                        className="form-control"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                      >
                        <option value="10">10 Questions (Recommended: MCQs & Conceptual Questions)</option>
                        <option value="8">8 Questions (Comprehensive)</option>
                        <option value="6">6 Questions (Standard)</option>
                        <option value="4">4 Questions (Fast)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: c.gray }}>
                        Target Difficulty
                      </label>
                      <select
                        className="form-control"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="mixed">Mixed (Easy, Medium & Hard)</option>
                        <option value="easy">Easy (Foundation / Beginner)</option>
                        <option value="medium">Medium (Standard Assessment)</option>
                        <option value="hard">Hard (Advanced / Olympiad)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* PDF Dropzone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c.darkGray }}>
                    Chapter PDF Document *
                  </label>

                  <div
                    className={`pdf-upload-dropzone ${isDragging ? "dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(e.target.files[0]);
                        }
                      }}
                    />

                    <Upload size={36} color={c.primary} className="mx-auto mb-2" />
                    <div className="text-sm font-bold" style={{ color: c.dark }}>
                      {isDragging ? "Drop PDF file here" : "Click to select PDF or drag & drop"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Supports full textbook chapters up to 50MB
                    </div>

                    {pdfFile && (
                      <div className="pdf-file-badge" onClick={(e) => e.stopPropagation()}>
                        <FileText size={16} />
                        <span>{pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        <button
                          type="button"
                          className="text-xs text-red-600 font-bold ml-2 hover:underline"
                          onClick={() => {
                            setPdfFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Error Alert */}
                {uploadError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                    <XCircle size={16} className="flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Live Pipeline Animation */}
                {isUploading && (
                  <div className="pipeline-container">
                    <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: c.primary }}>
                      ⚡ Automatic Ingestion Pipeline
                    </div>
                    <div className="pipeline-steps">
                      <div className={`pipeline-step-item ${uploadStage === 1 ? "active" : uploadStage > 1 ? "done" : "pending"}`}>
                        {uploadStage > 1 ? <CheckCircle size={16} color="#10b981" /> : uploadStage === 1 ? <RefreshCw size={16} className="pipeline-spinner" color={c.primary} /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                        <span>Stage 1: Uploading & Storing PDF in Filesystem</span>
                      </div>

                      <div className={`pipeline-step-item ${uploadStage === 2 ? "active" : uploadStage > 2 ? "done" : "pending"}`}>
                        {uploadStage > 2 ? <CheckCircle size={16} color="#10b981" /> : uploadStage === 2 ? <RefreshCw size={16} className="pipeline-spinner" color={c.primary} /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                        <span>Stage 2: Parsing & Extracting Clean Text Content</span>
                      </div>

                      <div className={`pipeline-step-item ${uploadStage === 3 ? "active" : uploadStage > 3 ? "done" : "pending"}`}>
                        {uploadStage > 3 ? <CheckCircle size={16} color="#10b981" /> : uploadStage === 3 ? <RefreshCw size={16} className="pipeline-spinner" color={c.primary} /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                        <span>Stage 3: Gemini AI Synthesizing Concepts & Generating Questions</span>
                      </div>

                      <div className={`pipeline-step-item ${uploadStage >= 4 ? (uploadStage === 5 ? "done" : "active") : "pending"}`}>
                        {uploadStage === 5 ? <CheckCircle size={16} color="#10b981" /> : uploadStage === 4 ? <RefreshCw size={16} className="pipeline-spinner" color={c.primary} /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                        <span>Stage 4: Writing Chapter Content & Questions to Relational Database</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <PrimaryButton
                  type="submit"
                  disabled={isUploading}
                  className="w-full text-base py-3 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={18} className="pipeline-spinner" />
                      Processing & Storing in DB...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Upload PDF & Auto-Ingest to Database
                    </>
                  )}
                </PrimaryButton>
              </form>
            </div>
          </div>

          {/* Right Column: Result / Quick Tips */}
          <div className="lg:col-span-4 space-y-4">
            {uploadResult ? (
              <div className="dashboard-card border-green-300" style={{ background: "#f5fbf7" }}>
                <div className="flex items-center gap-2 text-green-800 font-bold mb-3">
                  <CheckCircle size={20} color="#10b981" />
                  <span>Ingestion Successful!</span>
                </div>

                <div className="space-y-2 text-xs" style={{ color: c.dark }}>
                  <div><strong>Chapter:</strong> Ch {uploadResult.chapter_number}: {uploadResult.title}</div>
                  <div><strong>Course:</strong> {uploadResult.class} · {uploadResult.subject}</div>
                  <div><strong>Extracted Text:</strong> {uploadResult.text_length?.toLocaleString()} characters</div>
                  <div><strong>Questions in DB:</strong> {uploadResult.questions_count} questions generated</div>
                </div>

                <div className="mt-4 pt-3 border-t border-green-200 flex flex-col gap-2">
                  <button
                    type="button"
                    className="button-medium font-semibold rounded-lg text-xs flex items-center justify-center gap-2"
                    style={{ background: c.primary, color: "#fff" }}
                    onClick={() => openInspectModal(uploadResult.id)}
                  >
                    <Eye size={14} /> Inspect Extracted Content & Questions
                  </button>

                  <button
                    type="button"
                    className="button-medium font-semibold rounded-lg text-xs flex items-center justify-center gap-2"
                    style={{ background: "#fff", border: `1px solid ${c.primary}`, color: c.primary }}
                    onClick={() => navigate(`/quiz?chapter_id=${uploadResult.id}`)}
                  >
                    <Play size={14} /> Launch Practice Quiz
                  </button>
                </div>
              </div>
            ) : (
              <div className="dashboard-card">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} color={c.primary} />
                  <h3 className="font-bold text-sm" style={{ color: c.dark }}>
                    How Auto-Ingestion Works
                  </h3>
                </div>

                <div className="space-y-3 text-xs" style={{ color: c.gray, lineHeight: 1.6 }}>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                    <span><strong>Insert Subject:</strong> Create subjects for any class level and educational board.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                    <span><strong>PDF Text Extraction:</strong> The system parses multi-page PDFs, preserving English, Hindi, and scientific symbols.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                    <span><strong>AI Question Synthesis:</strong> Gemini analyzes key concepts, generating MCQs (with 4 options and explanations) and conceptual questions.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Card */}
            <div className="dashboard-card">
              <h3 className="font-bold text-sm mb-3" style={{ color: c.dark }}>
                Curriculum Hub Shortcuts
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("subjects")}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
                  style={{ border: "1px solid #e8e4da", color: c.dark }}
                >
                  <span className="flex items-center gap-2">
                    <Library size={14} color="#b45309" />
                    Manage {stats.total_subjects} Subjects
                  </span>
                  <ArrowRight size={14} color={c.gray} />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("chapters")}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
                  style={{ border: "1px solid #e8e4da", color: c.dark }}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} color={c.primary} />
                    View All {stats.total_chapters} Chapters
                  </span>
                  <ArrowRight size={14} color={c.gray} />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("questions")}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
                  style={{ border: "1px solid #e8e4da", color: c.dark }}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} color={c.accent} />
                    Explore {stats.total_questions} DB Questions
                  </span>
                  <ArrowRight size={14} color={c.gray} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SUBJECTS & CURRICULUM MANAGEMENT
          ========================================================================= */}
      {activeTab === "subjects" && (
        <div className="dashboard-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                Subjects & Curriculum Database
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Insert new subjects, configure boards and classes, and view chapter counts
              </p>
            </div>

            <button
              onClick={() => {
                setIsQuickSubjectModal(false);
                setEditingSubject(null);
                setNewSubjectData({
                  name: "",
                  class_id: classes[0]?.id || "",
                  board_id: "1",
                });
                setNewSubjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold"
              style={{ background: c.primary, color: "#fff" }}
            >
              <Plus size={14} /> Insert New Subject
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="filter-bar-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-pos" />
              <input
                type="text"
                placeholder="Search subjects (e.g. Mathematics, Science, Sanskrit)..."
                className="form-control"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAllSubjects()}
              />
            </div>

            <select
              className="form-control"
              style={{ minWidth: 140, width: "auto" }}
              value={filterSubClass}
              onChange={(e) => setFilterSubClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ minWidth: 140, width: "auto" }}
              value={filterSubBoard}
              onChange={(e) => setFilterSubBoard(e.target.value)}
            >
              <option value="">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <button
              onClick={loadAllSubjects}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ background: "#f5f2e9", border: "1px solid #e2ddd0", color: c.dark }}
            >
              <Filter size={14} /> Filter
            </button>
          </div>

          {/* Subjects Table */}
          {isLoadingSubjects ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw size={24} className="pipeline-spinner mx-auto mb-2" color={c.primary} />
              <p className="text-xs">Loading subjects from database...</p>
            </div>
          ) : allSubjects.length === 0 ? (
            <div className="text-center py-12 bg-amber-50/50 rounded-xl border border-amber-200 text-gray-600">
              <Library size={32} className="mx-auto mb-2 text-amber-500" />
              <p className="font-semibold text-sm">No subjects found</p>
              <p className="text-xs mt-1 text-gray-500">Click "Insert New Subject" to add your first subject.</p>
            </div>
          ) : (
            <div className="table-scroll-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Class Level</th>
                    <th>Board</th>
                    <th>Chapters Count</th>
                    <th>Created At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubjects.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div className="font-bold text-sm" style={{ color: c.dark }}>
                          {sub.name}
                        </div>
                      </td>

                      <td>
                        <span className="app-badge app-badge-info">
                          {sub.class_name}
                        </span>
                      </td>

                      <td>
                        <span className="app-badge app-badge-neutral">
                          {sub.board_name}
                        </span>
                      </td>

                      <td>
                        {sub.chapters_count > 0 ? (
                          <span className="app-badge app-badge-success">
                            <BookOpen size={12} /> {sub.chapters_count} Chapters
                          </span>
                        ) : (
                          <span className="app-badge app-badge-warning">
                            0 Chapters
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="text-xs text-gray-500">
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "System Default"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions-cell justify-end">
                          <button
                            className="action-icon-btn"
                            title="Upload / Modify PDF for Subject"
                            onClick={() => {
                              setSelectedClass(String(sub.class_id));
                              setSelectedSubject(String(sub.id));
                              handleTabChange("upload");
                            }}
                          >
                            <Upload size={14} />
                          </button>

                          <button
                            className="action-icon-btn"
                            title="Edit Subject Details"
                            onClick={() => {
                              setEditingSubject(sub);
                              setIsQuickSubjectModal(false);
                              setNewSubjectData({
                                name: sub.name,
                                class_id: String(sub.class_id),
                                board_id: String(sub.board_id || 1),
                              });
                              setNewSubjectModalOpen(true);
                            }}
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            className="action-icon-btn btn-delete"
                            title="Delete Subject"
                            onClick={() => handleDeleteSubject(sub.id, sub.name, sub.chapters_count)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CHAPTERS & EXTRACTED CONTENT REPOSITORY
          ========================================================================= */}
      {activeTab === "chapters" && (
        <div className="dashboard-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                Chapters & Content Database
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Browse stored chapter content, extracted text, and generated question counts
              </p>
            </div>

            <button
              onClick={() => handleTabChange("upload")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: c.primary, color: "#fff" }}
            >
              <Plus size={14} /> Add Chapter PDF
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="filter-bar-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-pos" />
              <input
                type="text"
                placeholder="Search chapter title or description..."
                className="form-control"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadChapters()}
              />
            </div>

            <select
              className="form-control"
              style={{ minWidth: 140, width: "auto" }}
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterSubject("");
              }}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ minWidth: 150, width: "auto" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="processed">Content Extracted</option>
              <option value="unprocessed">Unprocessed</option>
            </select>

            <button
              onClick={loadChapters}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ background: "#f5f2e9", border: "1px solid #e2ddd0", color: c.dark }}
            >
              <Filter size={14} /> Apply Filter
            </button>
          </div>

          {/* Chapters Table */}
          {isLoadingChapters ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw size={24} className="pipeline-spinner mx-auto mb-2" color={c.primary} />
              <p className="text-xs">Loading chapters from database...</p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-12 bg-amber-50/50 rounded-xl border border-amber-200 text-gray-600">
              <BookOpen size={32} className="mx-auto mb-2 text-amber-500" />
              <p className="font-semibold text-sm">No chapters found matching criteria</p>
              <p className="text-xs mt-1 text-gray-500">Upload a chapter PDF to begin or clear filters.</p>
            </div>
          ) : (
            <div className="table-scroll-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th>Class / Subject</th>
                    <th>Extracted Text Status</th>
                    <th>DB Questions</th>
                    <th>PDF File</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <div className="font-bold text-sm" style={{ color: c.dark }}>
                          Ch {ch.chapter_number}: {ch.title}
                        </div>
                        {ch.text_preview && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-md">
                            {ch.text_preview}...
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="app-badge app-badge-neutral">
                          {ch.class} · {ch.subject}
                        </span>
                      </td>

                      <td>
                        {ch.has_extracted_text ? (
                          <span className="app-badge app-badge-success">
                            <CheckCircle size={12} /> {ch.text_length?.toLocaleString()} chars
                          </span>
                        ) : (
                          <span className="app-badge app-badge-danger">
                            <XCircle size={12} /> No Text Extracted
                          </span>
                        )}
                      </td>

                      <td>
                        {ch.questions_count > 0 ? (
                          <span className="app-badge app-badge-info">
                            <HelpCircle size={12} /> {ch.questions_count} Questions
                          </span>
                        ) : (
                          <span className="app-badge app-badge-warning">
                            0 Questions
                          </span>
                        )}
                      </td>

                      <td>
                        {ch.source_file_url ? (
                          <span className="text-xs font-mono text-gray-600 truncate block max-w-[140px]" title={ch.source_file_url}>
                            {ch.source_file_url}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No PDF</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions-cell justify-end">
                          <button
                            className="action-icon-btn"
                            title="Upload / Modify PDF for Chapter"
                            onClick={() => {
                              if (ch.class_id) setSelectedClass(String(ch.class_id));
                              if (ch.subject_id) setSelectedSubject(String(ch.subject_id));
                              if (ch.chapter_number) setChapterNumber(String(ch.chapter_number));
                              if (ch.title) setTitle(ch.title);
                              handleTabChange("upload");
                            }}
                          >
                            <Upload size={14} />
                          </button>

                          <button
                            className="action-icon-btn"
                            title="Inspect Text & DB Questions"
                            onClick={() => openInspectModal(ch.id)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="action-icon-btn"
                            title="Reprocess with AI (Re-extract text & questions)"
                            disabled={reprocessingId === ch.id || !ch.has_pdf}
                            onClick={() => handleReprocess(ch.id)}
                          >
                            <RefreshCw size={14} className={reprocessingId === ch.id ? "pipeline-spinner" : ""} />
                          </button>

                          <button
                            className="action-icon-btn"
                            title="Generate More AI Questions"
                            disabled={reprocessingId === ch.id}
                            onClick={() => handleGenerateMoreQuestions(ch.id)}
                          >
                            <Plus size={15} />
                          </button>

                          <button
                            className="action-icon-btn"
                            title="Launch Quiz Test"
                            onClick={() => navigate(`/quiz?chapter_id=${ch.id}`)}
                          >
                            <Play size={14} />
                          </button>

                          <button
                            className="action-icon-btn btn-delete"
                            title="Delete Chapter"
                            onClick={() => handleDeleteChapter(ch.id, ch.title)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: DATABASE QUESTION BANK
          ========================================================================= */}
      {activeTab === "questions" && (
        <div className="dashboard-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                Question Bank Repository (Database)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All questions generated by Gemini and stored in the database for quizzes & assessments
              </p>
            </div>

            <button
              onClick={() => {
                setNewQuestionData({
                  chapter_id: chapters[0]?.id || "",
                  question_text: "",
                  question_type: "mcq",
                  difficulty: "medium",
                  correct_answer: "A",
                  options: [
                    { letter: "A", text: "" },
                    { letter: "B", text: "" },
                    { letter: "C", text: "" },
                    { letter: "D", text: "" },
                  ],
                });
                setAddQuestionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: c.primary, color: "#fff" }}
            >
              <Plus size={14} /> Add Custom Question
            </button>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-pos" />
              <input
                type="text"
                placeholder="Search question text..."
                className="form-control"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadQuestions()}
              />
            </div>

            <select
              className="form-control"
              style={{ minWidth: 150, width: "auto" }}
              value={filterQType}
              onChange={(e) => setFilterQType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="short_answer">Short Answer</option>
            </select>

            <select
              className="form-control"
              style={{ minWidth: 140, width: "auto" }}
              value={filterQDifficulty}
              onChange={(e) => setFilterQDifficulty(e.target.value)}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              onClick={loadQuestions}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ background: "#f5f2e9", border: "1px solid #e2ddd0", color: c.dark }}
            >
              <Filter size={14} /> Filter Questions
            </button>
          </div>

          {/* Question Cards Grid */}
          {isLoadingQuestions ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw size={24} className="pipeline-spinner mx-auto mb-2" color={c.primary} />
              <p className="text-xs">Loading question bank...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 bg-amber-50/50 rounded-xl border border-amber-200 text-gray-600">
              <HelpCircle size={32} className="mx-auto mb-2 text-amber-500" />
              <p className="font-semibold text-sm">No questions in database yet</p>
              <p className="text-xs mt-1 text-gray-500">Upload a PDF or reprocess existing chapters to auto-generate questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="question-item-card">
                  <div className="question-item-header">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="app-badge app-badge-info uppercase text-[10px]">
                        {q.question_type === "mcq" ? "Multiple Choice" : "Short Answer"}
                      </span>
                      <span
                        className={`app-badge ${
                          q.difficulty === "easy"
                            ? "app-badge-success"
                            : q.difficulty === "hard"
                            ? "app-badge-danger"
                            : "app-badge-warning"
                        } uppercase text-[10px]`}
                      >
                        {q.difficulty}
                      </span>
                      {q.chapter && (
                        <span className="text-xs text-gray-500 font-medium">
                          {q.chapter.subject?.class_level?.name || "Class"} · {q.chapter.subject?.name} · Ch {q.chapter.chapter_number}: {q.chapter.title}
                        </span>
                      )}
                    </div>

                    <button
                      className="action-icon-btn btn-delete"
                      title="Delete Question"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold mb-3" style={{ color: c.dark }}>
                    {idx + 1}. {q.question_text}
                  </h3>

                  {q.question_type === "mcq" && q.options && Array.isArray(q.options) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = opt.letter === q.correct_answer || opt.correct;
                        return (
                          <div
                            key={optIdx}
                            className={`question-mcq-option ${isCorrect ? "is-correct" : ""}`}
                          >
                            <div className="option-letter-badge">{opt.letter}</div>
                            <span className="flex-1">{opt.text}</span>
                            {isCorrect && <CheckCircle size={14} color="#306a5a" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === "short_answer" && (
                    <div className="p-2.5 rounded-lg mb-3 text-xs" style={{ background: "#dcede6", color: "#306a5a" }}>
                      <strong>Model Answer:</strong> {q.correct_answer}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="question-explanation-box">
                      💡 <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: BATCH AUTO-PROCESSOR
          ========================================================================= */}
      {activeTab === "batch" && (
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ ...headingFont, color: c.dark }}>
                Batch PDF Ingestion Processor
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically extract text and generate AI questions for existing textbook PDFs in storage
              </p>
            </div>
            <span className="app-badge app-badge-warning">
              {stats.unprocessed_chapters} Pending Processing
            </span>
          </div>

          <div className="p-5 rounded-xl mb-6" style={{ background: "#faf8f2", border: "1px solid #e8e4da" }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm" style={{ color: c.dark }}>
                  One-Click Auto-Ingestion
                </h3>
                <p className="text-xs text-gray-600 mt-1 max-w-lg">
                  Scans all chapters in the database with assigned PDF files that don't have extracted text or questions yet. It processes them sequentially using Gemini AI and stores questions directly into the database.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Batch Size</label>
                  <select
                    className="form-control"
                    style={{ minHeight: 38, padding: "6px 12px" }}
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(parseInt(e.target.value, 10))}
                    disabled={isBatchProcessing}
                  >
                    <option value="1">1 Chapter</option>
                    <option value="3">3 Chapters</option>
                    <option value="5">5 Chapters</option>
                  </select>
                </div>

                <div className="pt-4">
                  <PrimaryButton
                    type="button"
                    disabled={isBatchProcessing || stats.unprocessed_chapters === 0}
                    onClick={handleRunBatch}
                    className="flex items-center gap-2 text-sm"
                  >
                    {isBatchProcessing ? (
                      <>
                        <RefreshCw size={16} className="pipeline-spinner" />
                        Processing Batch...
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Process Next Batch
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </div>

            {batchMessage && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex items-center gap-2">
                <Brain size={16} />
                <span>{batchMessage}</span>
              </div>
            )}
          </div>

          {/* Batch results list */}
          {batchResults.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-3" style={{ color: c.dark }}>
                Recently Processed in this Batch
              </h3>
              <div className="space-y-2">
                {batchResults.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} color="#10b981" />
                      <span className="font-bold" style={{ color: c.dark }}>{r.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.text_length && (
                        <span className="app-badge app-badge-success">
                          {r.text_length} chars extracted
                        </span>
                      )}
                      {r.questions_count && (
                        <span className="app-badge app-badge-info">
                          {r.questions_count} questions generated in DB
                        </span>
                      )}
                      <button
                        className="text-amber-700 font-bold hover:underline"
                        onClick={() => openInspectModal(r.id)}
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          INSERT / EDIT SUBJECT MODAL
          ========================================================================= */}
      {newSubjectModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setNewSubjectModalOpen(false)}>
          <div className="admin-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="flex items-center gap-2">
                <Library size={20} color={c.primary} />
                <h2 className="text-lg font-bold" style={{ ...headingFont, color: c.dark }}>
                  {editingSubject ? "Edit Subject" : "Insert New Subject"}
                </h2>
              </div>
              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setNewSubjectModalOpen(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="admin-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: c.darkGray }}>
                  Class Level *
                </label>
                <select
                  className="form-control"
                  value={newSubjectData.class_id}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, class_id: e.target.value })}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: c.darkGray }}>
                  Educational Board
                </label>
                <select
                  className="form-control"
                  value={newSubjectData.board_id}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, board_id: e.target.value })}
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: c.darkGray }}>
                  Subject Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Mathematics, Science, Sanskrit, Coding..."
                  value={newSubjectData.name}
                  onChange={(e) => setNewSubjectData({ ...newSubjectData, name: e.target.value })}
                  required
                />
              </div>

              {subjectFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <XCircle size={15} />
                  <span>{subjectFormError}</span>
                </div>
              )}

              <div className="pt-2">
                <PrimaryButton
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isSubmittingSubject ? (
                    <>
                      <RefreshCw size={16} className="pipeline-spinner" />
                      Saving Subject...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingSubject ? "Update Subject" : "Insert Subject into Database"}
                    </>
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          INSPECT CHAPTER MODAL / DRAWER
          ========================================================================= */}
      {inspectModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setInspectModalOpen(false)}>
          <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  {inspectedChapter?.class?.name} · {inspectedChapter?.subject?.name}
                </div>
                <h2 className="text-lg font-bold" style={{ ...headingFont, color: c.dark }}>
                  Ch {inspectedChapter?.chapter_number}: {inspectedChapter?.title}
                </h2>
              </div>

              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setInspectModalOpen(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-6 gap-4">
              <button
                className={`py-3 text-xs font-bold border-b-2 transition-all ${
                  inspectActiveTab === "content"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
                onClick={() => setInspectActiveTab("content")}
              >
                📄 Extracted Text Content ({inspectedChapter?.text_length || 0} chars)
              </button>

              <button
                className={`py-3 text-xs font-bold border-b-2 transition-all ${
                  inspectActiveTab === "questions"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
                onClick={() => setInspectActiveTab("questions")}
              >
                ❓ Questions in Database ({inspectedChapter?.questions?.length || 0})
              </button>

              {inspectedChapter?.source_file_url && (
                <button
                  className={`py-3 text-xs font-bold border-b-2 transition-all ${
                    inspectActiveTab === "pdf"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                  onClick={() => setInspectActiveTab("pdf")}
                >
                  📖 PDF Viewer
                </button>
              )}
            </div>

            <div className="admin-modal-body">
              {isLoadingInspect ? (
                <div className="text-center py-12 text-gray-500">
                  <RefreshCw size={24} className="pipeline-spinner mx-auto mb-2" color={c.primary} />
                  <p className="text-xs">Loading chapter content...</p>
                </div>
              ) : inspectActiveTab === "content" ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      Total extracted length: <strong>{inspectedChapter?.text_length}</strong> characters
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 text-gray-700"
                    >
                      {copiedText ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedText ? "Copied to Clipboard!" : "Copy Extracted Text"}
                    </button>
                  </div>

                  {inspectedChapter?.extracted_text ? (
                    <div className="extracted-content-box">
                      {inspectedChapter.extracted_text}
                    </div>
                  ) : (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 text-xs">
                      No extracted text found for this chapter. Click <strong>Reprocess</strong> to extract content from the PDF file.
                    </div>
                  )}
                </div>
              ) : inspectActiveTab === "questions" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">
                      Stored Questions ({inspectedChapter?.questions?.length || 0})
                    </span>

                    <button
                      type="button"
                      onClick={() => handleGenerateMoreQuestions(inspectedChapter.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center gap-1"
                    >
                      <Plus size={14} /> Generate More Questions
                    </button>
                  </div>

                  {inspectedChapter?.questions && inspectedChapter.questions.length > 0 ? (
                    inspectedChapter.questions.map((q, idx) => (
                      <div key={q.id || idx} className="question-item-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="app-badge app-badge-info text-[10px]">
                              {q.question_type === "mcq" ? "MCQ" : "Short Answer"}
                            </span>
                            <span className="app-badge app-badge-warning text-[10px]">
                              {q.difficulty}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-bold text-xs mb-2" style={{ color: c.dark }}>
                          {idx + 1}. {q.question_text}
                        </h4>

                        {q.options && Array.isArray(q.options) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = opt.letter === q.correct_answer || opt.correct;
                              return (
                                <div
                                  key={optIdx}
                                  className={`question-mcq-option ${isCorrect ? "is-correct" : ""}`}
                                >
                                  <div className="option-letter-badge">{opt.letter}</div>
                                  <span className="flex-1">{opt.text}</span>
                                  {isCorrect && <CheckCircle size={14} color="#306a5a" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="question-explanation-box text-[11px]">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl text-xs text-gray-500">
                      No questions saved yet. Click "Generate More Questions" or "Reprocess" to generate AI questions.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {inspectedChapter?.source_file_url ? (
                    <iframe
                      src={inspectedChapter.source_file_url}
                      className="w-full rounded-xl border border-gray-300"
                      style={{ height: "500px" }}
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="text-center py-12 text-xs text-gray-500">
                      No PDF URL available.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD CUSTOM QUESTION MODAL
          ========================================================================= */}
      {addQuestionModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setAddQuestionModalOpen(false)}>
          <div className="admin-modal-container max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="text-lg font-bold" style={{ ...headingFont, color: c.dark }}>
                Add Custom Question to DB
              </h2>
              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setAddQuestionModalOpen(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await post("/admin/questions", newQuestionData);
                  alert("Question saved into database successfully!");
                  setAddQuestionModalOpen(false);
                  loadQuestions();
                  loadStats();
                } catch (err) {
                  alert(`Failed to save question: ${err.message}`);
                }
              }}
              className="admin-modal-body space-y-4"
            >
              <div>
                <label className="block text-xs font-bold mb-1">Target Chapter *</label>
                <select
                  className="form-control"
                  value={newQuestionData.chapter_id}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, chapter_id: e.target.value })}
                  required
                >
                  <option value="">Select Chapter</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.class} · {ch.subject} · Ch {ch.chapter_number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Question Text *</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={newQuestionData.question_text}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, question_text: e.target.value })}
                  required
                  placeholder="Enter the question..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Question Type</label>
                  <select
                    className="form-control"
                    value={newQuestionData.question_type}
                    onChange={(e) => setNewQuestionData({ ...newQuestionData, question_type: e.target.value })}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Difficulty</label>
                  <select
                    className="form-control"
                    value={newQuestionData.difficulty}
                    onChange={(e) => setNewQuestionData({ ...newQuestionData, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {newQuestionData.question_type === "mcq" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold">Options & Correct Answer *</label>
                  {["A", "B", "C", "D"].map((letter, idx) => (
                    <div key={letter} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_opt"
                        checked={newQuestionData.correct_answer === letter}
                        onChange={() => setNewQuestionData({ ...newQuestionData, correct_answer: letter })}
                      />
                      <span className="text-xs font-bold w-4">{letter}</span>
                      <Input
                        type="text"
                        placeholder={`Option ${letter} text`}
                        value={newQuestionData.options[idx]?.text || ""}
                        onChange={(e) => {
                          const updated = [...newQuestionData.options];
                          updated[idx] = { letter, text: e.target.value };
                          setNewQuestionData({ ...newQuestionData, options: updated });
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold mb-1">Correct / Model Answer *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={newQuestionData.correct_answer}
                    onChange={(e) => setNewQuestionData({ ...newQuestionData, correct_answer: e.target.value })}
                    required
                    placeholder="Enter the model answer..."
                  />
                </div>
              )}

              <div className="pt-2">
                <PrimaryButton type="submit" className="w-full">
                  Save Question to Database
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
