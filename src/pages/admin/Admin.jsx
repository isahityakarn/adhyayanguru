import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  Archive,
  BookOpen,
  Check,
  ChevronRight,
  Grid2X2,
  Library,
  LogOut,
  Menu,
  Upload,
  Users,
  X,
} from "lucide-react";

import { getDashboardStats } from "../../services/dashboardApi";
import { getClasses } from "../../services/classApi";
import {
  bulkDownloadPdfs,
  downloadPdf,
  getPdfs,
  previewPdf,
  previewPdfFile,
  updatePdf,
  uploadPdf,
} from "../../services/pdfApi";
import { downloadFile, get, post } from "../../utils/api";

import AdminUploadPage from "./AdminUpload";
import CurriculumExplorer from "./components/CurriculumExplorer";
import DashboardView from "./components/DashboardView";
import PdfView from "./components/PdfView";
import UsersView from "./components/UsersView";
import PreviewModal from "./components/PreviewModal";
import UploadModal from "./components/UploadModal";

// ---------------------------------------------------------------------------
// Sidebar navigation structure
// ---------------------------------------------------------------------------
const navGroups = [
  {
    groupName: "Overview",
    items: [["dashboard", "Dashboard", Grid2X2]],
  },
  {
    groupName: "Curriculum & Library",
    items: [
      ["classes", "Classes", BookOpen],
      ["pdfs", "PDF Library", Library],
    ],
  },
  {
    groupName: "AI Ingestion Engine",
    items: [["upload", "Upload & Process", Upload]],
  },
  {
    groupName: "Management & System",
    items: [["users", "User Management", Users]],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

const emptyStats = {
  total_classes: 0,
  total_subjects: 0,
  total_chapters: 0,
  total_pdfs: 0,
  total_downloads: 0,
  storage_used: "0 MB",
};

// ---------------------------------------------------------------------------
// Main admin shell
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const navigate = useNavigate();
  const params = useParams();
  const urlSection = params["*"] && params["*"].split("/")[0];
  const [searchParams] = useSearchParams();
  const section =
    urlSection ||
    searchParams.get("section") ||
    searchParams.get("tab") ||
    "dashboard";

  // Core data
  const [stats, setStats] = useState(emptyStats);
  const [classes, setClasses] = useState([]);
  const [pdfs, setPdfs] = useState([]);

  // UI state
  const [pdfClassFilter, setPdfClassFilter] = useState(null);
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  // Upload / Edit modal state
  const [editingPdf, setEditingPdf] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadClassId, setUploadClassId] = useState("");
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadSubjects, setUploadSubjects] = useState([]);
  const [uploadChapterNumber, setUploadChapterNumber] = useState("1");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModalError, setUploadModalError] = useState("");

  // Inline new-subject state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const handleLogout = () => {
    localStorage.removeItem("studyyodha_user");
    localStorage.removeItem("studyyodha_user_role");
    localStorage.removeItem("studyyodha_token");
    navigate("/");
  };

  const handleSelectSection = (selectedId) => {
    navigate(`/admin/${selectedId}`);
    setMobileNav(false);
  };

  // ---------------------------------------------------------------------------
  // Data loaders
  // ---------------------------------------------------------------------------
  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsResponse, classResponse] = await Promise.all([
        getDashboardStats(),
        getClasses({ per_page: 50 }),
      ]);
      setStats(statsResponse.data || emptyStats);
      setClasses(classResponse.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const loadPdfs = async (overrideClassId) => {
    setLoading(true);
    setError("");
    try {
      const activeClassId =
        overrideClassId !== undefined ? overrideClassId : pdfClassFilter?.id;
      const queryParams = { per_page: 50, search };
      if (activeClassId) queryParams.class_id = activeClassId;
      const response = await getPdfs(queryParams);
      setPdfs(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load PDF library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (section === "pdfs") loadPdfs();
  }, [section, pdfClassFilter]);

  // Fetch subjects whenever upload class changes
  useEffect(() => {
    if (uploadClassId) {
      get(`/admin/subjects?class_id=${uploadClassId}`)
        .then((res) => {
          const fetchedSubjects = res.subjects || [];
          setUploadSubjects(fetchedSubjects);
          if (
            editingPdf &&
            fetchedSubjects.some(
              (s) => String(s.id) === String(editingPdf.subject_id),
            )
          ) {
            setUploadSubjectId(editingPdf.subject_id);
          } else if (fetchedSubjects.length > 0) {
            setUploadSubjectId(fetchedSubjects[0].id);
          } else {
            setUploadSubjectId("");
          }
        })
        .catch(() => setUploadSubjects([]));
    } else {
      setUploadSubjects([]);
      setUploadSubjectId("");
    }
  }, [uploadClassId]);

  // ---------------------------------------------------------------------------
  // Class / PDF actions
  // ---------------------------------------------------------------------------
  const openClass = (item) => {
    setPdfClassFilter(item);
    handleSelectSection("pdfs");
  };

  const togglePdf = (id) =>
    setSelectedPdfs((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const handleBulkDownload = async () => {
    try {
      const response = await bulkDownloadPdfs(selectedPdfs);
      await downloadFile(
        response.data.download_url.replace(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}`,
          "",
        ),
      );
      showNotice("Your ZIP archive is ready.");
      setSelectedPdfs([]);
    } catch (requestError) {
      setError(requestError.message || "Bulk download failed.");
    }
  };

  const openPreview = async (pdf) => {
    try {
      const [response, fileUrl] = await Promise.all([
        previewPdf(pdf.id),
        previewPdfFile(pdf.id),
      ]);
      setPreview({ ...response.data, fileUrl, pdf });
    } catch (requestError) {
      setError(requestError.message || "Preview unavailable.");
    }
  };

  // ---------------------------------------------------------------------------
  // Upload / Edit modal actions
  // ---------------------------------------------------------------------------
  const openUploadModal = (prefillClassId = "", prefillSubjectId = "") => {
    setEditingPdf(null);
    const savedClassId = localStorage.getItem("last_admin_upload_class_id");
    const savedSubjectId = localStorage.getItem("last_admin_upload_subject_id");
    const defaultClassId =
      prefillClassId || savedClassId || classes[0]?.id || "";
    setUploadClassId(defaultClassId);
    if (prefillSubjectId || savedSubjectId) {
      setUploadSubjectId(prefillSubjectId || savedSubjectId);
    }
    setUploadChapterNumber("1");
    setUploadTitle("");
    setUploadFile(null);
    setUploadModalError("");
    setShowAddSubject(false);
    setNewSubjectName("");
    setUploadModalOpen(true);
  };

  const openEditPdfModal = (pdf) => {
    setEditingPdf(pdf);
    setUploadClassId(pdf.class_id || classes[0]?.id || "");
    setUploadSubjectId(pdf.subject_id || "");
    setUploadChapterNumber(pdf.chapter_number || "1");
    setUploadTitle(pdf.name || pdf.title || "");
    setUploadFile(null);
    setUploadModalError("");
    setShowAddSubject(false);
    setNewSubjectName("");
    setUploadModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setUploadModalError(
        `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed limit of 15 MB. Please select a smaller PDF.`,
      );
      setUploadFile(null);
      e.target.value = "";
      return;
    }
    setUploadModalError("");
    setUploadFile(file);
    if (!uploadTitle && !editingPdf) {
      const cleanName = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
      setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleCreateSubject = async () => {
    const missing = [];
    if (!newSubjectName.trim()) missing.push("Subject Name");
    if (!uploadClassId) missing.push("Class Level");
    if (missing.length > 0) {
      setUploadModalError(
        `Validation failed: The following field(s) are required: ${missing.join(", ")}.`,
      );
      return;
    }
    setIsCreatingSubject(true);
    setUploadModalError("");
    try {
      const res = await post("/admin/subjects", {
        name: newSubjectName.trim(),
        class_id: uploadClassId,
        board_id: 1,
      });
      const created = res.subject;
      showNotice(`Subject '${created.name}' created successfully.`);
      const updatedRes = await get(`/admin/subjects?class_id=${uploadClassId}`);
      const updatedList = updatedRes.subjects || [];
      setUploadSubjects(updatedList);
      setUploadSubjectId(created.id);
      setNewSubjectName("");
      setShowAddSubject(false);
      await loadDashboard();
    } catch (err) {
      const detailedError =
        err.errors && Object.keys(err.errors).length > 0
          ? Object.values(err.errors).flat().join(" ")
          : err.message || "Failed to create subject.";
      setUploadModalError(detailedError);
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const missingFields = [];
    if (!uploadClassId) missingFields.push("Class Level");
    if (!uploadSubjectId) missingFields.push("Subject");
    if (!uploadChapterNumber) missingFields.push("Chapter Number");
    if (!uploadTitle.trim()) missingFields.push("Chapter Title");
    if (!editingPdf && !uploadFile) missingFields.push("PDF File");
    if (missingFields.length > 0) {
      setUploadModalError(
        `Validation failed: The following field(s) are required: ${missingFields.join(", ")}.`,
      );
      return;
    }
    if (uploadFile && uploadFile.size > 15 * 1024 * 1024) {
      setUploadModalError(
        `File size (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed limit of 15 MB.`,
      );
      return;
    }
    setIsUploading(true);
    setUploadModalError("");
    try {
      const form = new FormData();
      if (editingPdf) {
        form.append("id", editingPdf.id);
        form.append("pdf_id", editingPdf.id);
      }
      form.append("class_id", uploadClassId);
      form.append("subject_id", uploadSubjectId);
      form.append("chapter_number", uploadChapterNumber);
      form.append("title", uploadTitle.trim());
      form.append("name", uploadTitle.trim());
      if (uploadFile) {
        form.append("file", uploadFile);
        form.append("pdf_file", uploadFile);
        form.append("pdf_name", uploadFile.name);
      }
      if (editingPdf) {
        try {
          await updatePdf(editingPdf.id, {
            class_id: uploadClassId,
            subject_id: uploadSubjectId,
            chapter_number: uploadChapterNumber,
            title: uploadTitle.trim(),
            name: uploadTitle.trim(),
          });
        } catch {
          await uploadPdf(form);
        }
        showNotice("Subject PDF material updated successfully.");
      } else {
        await uploadPdf(form);
        showNotice("Chapter PDF material uploaded successfully.");
      }
      if (uploadClassId)
        localStorage.setItem("last_admin_upload_class_id", uploadClassId);
      if (uploadSubjectId)
        localStorage.setItem("last_admin_upload_subject_id", uploadSubjectId);
      setUploadModalOpen(false);
      setEditingPdf(null);
      await loadDashboard();
      if (section === "pdfs") await loadPdfs();
    } catch (requestError) {
      const detailedError =
        requestError.errors && Object.keys(requestError.errors).length > 0
          ? Object.values(requestError.errors).flat().join(" ")
          : requestError.message || "Upload failed. Please check parameters.";
      setUploadModalError(detailedError);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="admin-console">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark">
            <Archive size={19} />
          </div>
          <div>
            <strong>AdhyayanGuru</strong>
            <span>Admin workspace</span>
          </div>
          <button
            className="admin-close-nav"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {navGroups.map((group) => (
            <div key={group.groupName} style={{ marginBottom: "16px" }}>
              <div className="admin-nav-label">{group.groupName}</div>
              <nav>
                {group.items.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    className={section === id ? "active" : ""}
                    onClick={() => handleSelectSection(id)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    {id === "pdfs" && stats.total_pdfs > 0 && (
                      <small>{stats.total_pdfs}</small>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="admin-sidebar-foot">
          <div className="admin-status">
            <span />
            <div>
              <strong>System operational</strong>
              <small>All services online</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="admin-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <strong>
              {allNavItems.find(([id]) => id === section)?.[1] || "Dashboard"}
            </strong>
          </div>
          <div
            className="admin-user"
            style={{ display: "flex", alignItems: "center" }}
          >
            <div className="admin-user-avatar">AD</div>
            <div>
              <strong>Administrator</strong>
              <span>Content operations</span>
            </div>
            <button
              onClick={handleLogout}
              className="admin-logout-btn"
              title="Logout"
              style={{
                marginLeft: "15px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: "4px",
                display: "flex",
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          {error && (
            <div className="admin-alert">
              <X size={16} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="admin-notice">
              <Check size={16} />
              <span>{notice}</span>
            </div>
          )}

          {section === "dashboard" && (
            <DashboardView
              stats={stats}
              classes={classes}
              loading={loading}
              onClasses={() => handleSelectSection("classes")}
              onPdfs={() => handleSelectSection("pdfs")}
              onClass={openClass}
              onOpenUploadModal={openUploadModal}
            />
          )}
          {section === "classes" && (
            <CurriculumExplorer
              classes={classes}
              onOpenUploadModal={openUploadModal}
            />
          )}
          {section === "pdfs" && (
            <PdfView
              pdfs={pdfs}
              classes={classes}
              pdfClassFilter={pdfClassFilter}
              setPdfClassFilter={setPdfClassFilter}
              loading={loading}
              search={search}
              setSearch={setSearch}
              selectedPdfs={selectedPdfs}
              togglePdf={togglePdf}
              onPreview={openPreview}
              onDownload={downloadPdf}
              onBulk={handleBulkDownload}
              onOpenUploadModal={openUploadModal}
              onEditPdf={openEditPdfModal}
            />
          )}
          {section === "upload" && (
            <AdminUploadPage initialTab="upload" embedded={true} />
          )}
          {section === "users" && <UsersView />}
        </div>
      </main>

      {/* Modals */}
      {preview && (
        <PreviewModal
          preview={preview}
          onClose={() => setPreview(null)}
          onDownload={() => downloadPdf(preview.pdf.id)}
        />
      )}

      {uploadModalOpen && (
        <UploadModal
          editingPdf={editingPdf}
          classes={classes}
          classId={uploadClassId}
          setClassId={setUploadClassId}
          subjectId={uploadSubjectId}
          setSubjectId={setUploadSubjectId}
          subjects={uploadSubjects}
          chapterNumber={uploadChapterNumber}
          setChapterNumber={setUploadChapterNumber}
          title={uploadTitle}
          setTitle={setUploadTitle}
          file={uploadFile}
          onFileChange={handleFileChange}
          isUploading={isUploading}
          error={uploadModalError}
          showAddSubject={showAddSubject}
          setShowAddSubject={setShowAddSubject}
          newSubjectName={newSubjectName}
          setNewSubjectName={setNewSubjectName}
          isCreatingSubject={isCreatingSubject}
          onCreateSubject={handleCreateSubject}
          onClose={() => {
            setUploadModalOpen(false);
            setEditingPdf(null);
          }}
          onSubmit={handleUploadSubmit}
          onOpenFullEngine={() => {
            setUploadModalOpen(false);
            setEditingPdf(null);
            handleSelectSection("upload");
          }}
        />
      )}
    </div>
  );
}
