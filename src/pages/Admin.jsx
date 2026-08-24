import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Archive, BookOpen, Check, ChevronRight, Download, Edit, FileText, FolderOpen, Grid2X2, HelpCircle, Library, Menu, Plus, Search, ShieldCheck, Sparkles, Upload, Users, X } from "lucide-react";
import { getDashboardStats } from "../services/dashboardApi";
import { bulkDownloadClass, getClasses } from "../services/classApi";
import { bulkDownloadPdfs, downloadPdf, getPdfs, previewPdf, previewPdfFile, updatePdf, uploadPdf } from "../services/pdfApi";
import { downloadFile, get, post } from "../utils/api";
import AdminUploadPage from "./AdminUpload";

const navGroups = [
  {
    groupName: "Overview",
    items: [
      ["dashboard", "Dashboard", Grid2X2],
    ]
  },
  {
    groupName: "Curriculum & Library",
    items: [
      ["classes", "Classes", BookOpen],
      ["subjects", "Subjects & Curriculum", FolderOpen],
      ["chapters", "Chapters Repository", FileText],
      ["pdfs", "PDF Library", Library],
    ]
  },
  {
    groupName: "AI Ingestion Engine",
    items: [
      ["upload", "Upload & Process", Upload],
      ["questions", "Question Bank (DB)", HelpCircle],
      ["batch", "Batch AI Processor", Sparkles],
    ]
  },
  {
    groupName: "Management & System",
    items: [
      ["downloads", "Downloads Log", Download],
      ["users", "User Management", Users],
      ["settings", "System Settings", ShieldCheck]
    ]
  }
];

const allNavItems = navGroups.flatMap((group) => group.items);

const emptyStats = { total_classes: 0, total_subjects: 0, total_chapters: 0, total_pdfs: 0, total_downloads: 0, storage_used: "0 MB" };

export default function AdminPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get("section") || searchParams.get("tab") || "dashboard";
  const [section, setSection] = useState(initialSection);
  const [stats, setStats] = useState(emptyStats);
  const [classes, setClasses] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  // Upload & Edit Modal State
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

  // New Subject inline creation state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const loadDashboard = async () => {
    setLoading(true); setError("");
    try {
      const [statsResponse, classResponse] = await Promise.all([getDashboardStats(), getClasses({ per_page: 50 })]);
      setStats(statsResponse.data || emptyStats);
      setClasses(classResponse.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const loadPdfs = async () => {
    setLoading(true); setError("");
    try {
      const response = await getPdfs({ per_page: 50, search });
      setPdfs(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load PDF library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (section === "pdfs") loadPdfs(); }, [section]);

  // Keep section synchronized with search parameter if changed externally
  useEffect(() => {
    const currentTab = searchParams.get("section") || searchParams.get("tab");
    if (currentTab && currentTab !== section) {
      setSection(currentTab);
    }
  }, [searchParams]);

  const handleSelectSection = (selectedId) => {
    setSection(selectedId);
    setSearchParams({ section: selectedId });
    setMobileNav(false);
  };

  // Fetch subjects whenever uploadClassId changes in Upload Modal
  useEffect(() => {
    if (uploadClassId) {
      get(`/admin/subjects?class_id=${uploadClassId}`)
        .then((res) => {
          const fetchedSubjects = res.subjects || [];
          setUploadSubjects(fetchedSubjects);
          // If we are editing an existing item, preserve its subject_id if valid
          if (editingPdf && fetchedSubjects.some(s => String(s.id) === String(editingPdf.subject_id))) {
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

  const visibleClasses = useMemo(() => classes.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [classes, search]);
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 3500); };
  const openClass = (item) => { setSelectedClass(item); handleSelectSection("classes"); };
  const togglePdf = (id) => setSelectedPdfs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  
  const secureBulkDownload = async (response, message) => {
    await downloadFile(response.data.download_url.replace(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}`, ""));
    showNotice(message);
  };

  const handleBulkDownload = async () => {
    try {
      await secureBulkDownload(await bulkDownloadPdfs(selectedPdfs), "Your ZIP archive is ready.");
      setSelectedPdfs([]);
    } catch (requestError) {
      setError(requestError.message || "Bulk download failed.");
    }
  };

  const handleClassDownload = async (classId) => {
    try {
      await secureBulkDownload(await bulkDownloadClass(classId), "Class archive downloaded.");
    } catch (requestError) {
      setError(requestError.message || "Class download failed.");
    }
  };

  const openPreview = async (pdf) => {
    try {
      const [response, fileUrl] = await Promise.all([previewPdf(pdf.id), previewPdfFile(pdf.id)]);
      setPreview({ ...response.data, fileUrl, pdf });
    } catch (requestError) {
      setError(requestError.message || "Preview unavailable.");
    }
  };

  const openUploadModal = (prefillClassId = "", prefillSubjectId = "") => {
    setEditingPdf(null);
    const savedClassId = localStorage.getItem("last_admin_upload_class_id");
    const savedSubjectId = localStorage.getItem("last_admin_upload_subject_id");

    const defaultClassId = prefillClassId || selectedClass?.id || savedClassId || classes[0]?.id || "";
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
      setUploadModalError(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed limit of 15 MB. Please select a smaller PDF.`);
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
      setUploadModalError(`Validation failed: The following field(s) are required: ${missing.join(", ")}.`);
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
      let detailedError = "";
      if (err.errors && Object.keys(err.errors).length > 0) {
        detailedError = Object.values(err.errors).flat().join(" ");
      } else {
        detailedError = err.message || "Failed to create subject.";
      }
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
      setUploadModalError(`Validation failed: The following field(s) are required: ${missingFields.join(", ")}.`);
      return;
    }

    if (uploadFile && uploadFile.size > 15 * 1024 * 1024) {
      setUploadModalError(`File size (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed limit of 15 MB.`);
      return;
    }

    setIsUploading(true);
    setUploadModalError("");

    try {
      let base64Data = null;
      if (uploadFile) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      }

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
        form.append("pdf_base64", base64Data);
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
            ...(base64Data ? { pdf_base64: base64Data, pdf_name: uploadFile.name } : {})
          });
        } catch {
          await uploadPdf(form);
        }
        showNotice("Subject PDF material updated successfully.");
      } else {
        await uploadPdf(form);
        showNotice("Chapter PDF material uploaded successfully.");
      }

      if (uploadClassId) localStorage.setItem("last_admin_upload_class_id", uploadClassId);
      if (uploadSubjectId) localStorage.setItem("last_admin_upload_subject_id", uploadSubjectId);

      setUploadModalOpen(false);
      setEditingPdf(null);
      await loadDashboard();
      if (section === "pdfs") await loadPdfs();
    } catch (requestError) {
      let detailedError = "";
      if (requestError.errors && Object.keys(requestError.errors).length > 0) {
        detailedError = Object.values(requestError.errors).flat().join(" ");
      } else {
        detailedError = requestError.message || "Upload failed. Please check parameters.";
      }
      setUploadModalError(detailedError);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="admin-console">
      <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark"><Archive size={19} /></div>
          <div><strong>AdhyayanGuru</strong><span>Admin workspace</span></div>
          <button className="admin-close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {navGroups.map((group) => (
            <div key={group.groupName} style={{ marginBottom: "16px" }}>
              <div className="admin-nav-label">{group.groupName}</div>
              <nav>
                {group.items.map(([id, label, Icon]) => (
                  <button key={id} className={section === id ? "active" : ""} onClick={() => handleSelectSection(id)}>
                    <Icon size={17} />
                    <span>{label}</span>
                    {id === "pdfs" && stats.total_pdfs > 0 && <small>{stats.total_pdfs}</small>}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="admin-sidebar-foot">
          <div className="admin-status"><span /><div><strong>System operational</strong><small>All services online</small></div></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="admin-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <strong>{allNavItems.find(([id]) => id === section)?.[1] || "Dashboard"}</strong>
          </div>
          <div className="admin-user"><div className="admin-user-avatar">AD</div><div><strong>Administrator</strong><span>Content operations</span></div></div>
        </header>

        <div className="admin-content">
          {error && <div className="admin-alert"><X size={16} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
          {notice && <div className="admin-notice"><Check size={16} /><span>{notice}</span></div>}

          {section === "dashboard" && <DashboardView stats={stats} classes={classes} loading={loading} onClasses={() => handleSelectSection("classes")} onPdfs={() => handleSelectSection("pdfs")} onClass={openClass} onOpenUploadModal={openUploadModal} />}
          {section === "classes" && <ClassesView classes={visibleClasses} loading={loading} search={search} setSearch={setSearch} onClass={openClass} onDownload={handleClassDownload} onOpenUploadModal={openUploadModal} />}
          {section === "subjects" && <AdminUploadPage initialTab="subjects" embedded={true} />}
          {section === "chapters" && <AdminUploadPage initialTab="chapters" embedded={true} />}
          {section === "pdfs" && <PdfView pdfs={pdfs} loading={loading} search={search} setSearch={setSearch} selectedPdfs={selectedPdfs} togglePdf={togglePdf} onPreview={openPreview} onDownload={downloadPdf} onBulk={handleBulkDownload} onOpenUploadModal={openUploadModal} onEditPdf={openEditPdfModal} />}
          {section === "upload" && <AdminUploadPage initialTab="upload" embedded={true} />}
          {section === "questions" && <AdminUploadPage initialTab="questions" embedded={true} />}
          {section === "batch" && <AdminUploadPage initialTab="batch" embedded={true} />}
          {section === "downloads" && <DownloadsView stats={stats} />}
          {section === "users" && <UsersView />}
          {section === "settings" && <SettingsView />}
        </div>
      </main>

      {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} onDownload={() => downloadPdf(preview.pdf.id)} />}

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
          onClose={() => { setUploadModalOpen(false); setEditingPdf(null); }}
          onSubmit={handleUploadSubmit}
          onOpenFullEngine={() => { setUploadModalOpen(false); setEditingPdf(null); handleSelectSection("upload"); }}
        />
      )}
    </div>
  );
}

function DashboardView({ stats, classes, loading, onClasses, onPdfs, onClass, onOpenUploadModal }) {
  const cards = [
    ["Total classes", stats.total_classes, "12 grade levels", BookOpen],
    ["Total subjects", stats.total_subjects, "Across all classes", FolderOpen],
    ["Total chapters", stats.total_chapters, "Curriculum units", FileText],
    ["PDF materials", stats.total_pdfs, `${stats.storage_used} stored`, Library]
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Overview</span>
          <h1>Good morning, Admin.</h1>
          <p>Keep the learning library organized and ready for every classroom.</p>
        </div>
        <button className="admin-primary-button" onClick={() => onOpenUploadModal()}>
          <Upload size={16} /> Add / Modify Material
        </button>
      </div>

      <section className="admin-stat-grid">
        {cards.map(([label, value, hint, Icon]) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-icon"><Icon size={18} /></div>
            <span>{label}</span>
            <strong>{loading ? "--" : value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </section>

      <div className="admin-section-heading">
        <div>
          <h2>Class coverage</h2>
          <p>See how complete each grade-level library is.</p>
        </div>
        <button className="admin-link-button" onClick={onClasses}>View all classes <ChevronRight size={15} /></button>
      </div>

      <div className="admin-class-grid">
        {classes.slice(0, 6).map((item) => (
          <button className="admin-class-card" key={item.id} onClick={() => onClass(item)}>
            <div className="admin-class-number">{item.name.replace("Class ", "")}</div>
            <div>
              <strong>{item.name}</strong>
              <span>{item.subject_count} subjects · {item.pdf_count} PDFs</span>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>

      <div className="admin-section-heading admin-section-heading-spaced">
        <div>
          <h2>Library status</h2>
          <p>Every resource is organized by class, subject, and chapter.</p>
        </div>
        <button className="admin-link-button" onClick={onPdfs}>Open library <ChevronRight size={15} /></button>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-empty">
          <Library size={25} />
          <strong>PDF library is connected to your curriculum.</strong>
          <span>Preview, select, and modify resources from one place.</span>
        </div>
      </div>
    </>
  );
}

function ClassesView({ classes, loading, search, setSearch, onClass, onDownload, onOpenUploadModal }) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Curriculum</span>
          <h1>All classes</h1>
          <p>Manage material availability across Class 1 through Class 12.</p>
        </div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes" />
        </div>
        <span className="admin-result-count">{classes.length} classes</span>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr><th>Class</th><th>Subjects</th><th>Chapters</th><th>PDFs</th><th>Last updated</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7"><LoadingRows /></td></tr> : classes.map((item) => (
              <tr key={item.id}>
                <td>
                  <button className="admin-table-title" onClick={() => onClass(item)}>
                    <span className="admin-class-number small">{item.name.replace("Class ", "")}</span>
                    <strong>{item.name}</strong>
                  </button>
                </td>
                <td>{item.subject_count}</td>
                <td>{item.chapter_count}</td>
                <td className="admin-strong-cell">{item.pdf_count}</td>
                <td>{item.last_updated || "Not yet"}</td>
                <td><span className={`admin-pill ${item.pdf_available ? "available" : "pending"}`}>{item.pdf_available ? "Available" : "Needs material"}</span></td>
                <td>
                  <div className="admin-row-actions">
                    <button title="Upload / Modify PDF for Class" onClick={() => onOpenUploadModal(item.id)}><Upload size={16} /></button>
                    <button title="View class" onClick={() => onClass(item)}><ChevronRight size={16} /></button>
                    <button title="Download all" onClick={() => onDownload(item.id)}><Download size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !classes.length && <EmptyState label="No classes match this search." />}
      </div>
    </>
  );
}

function PdfView({ pdfs, loading, search, setSearch, selectedPdfs, togglePdf, onPreview, onDownload, onBulk, onOpenUploadModal, onEditPdf }) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Content library</span>
          <h1>PDF materials</h1>
          <p>Preview, modify, update, and distribute the resources powering every lesson.</p>
        </div>
        <button className="admin-primary-button" onClick={() => onOpenUploadModal()}>
          <Upload size={16} /> Upload PDF
        </button>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSearch(event.target.value)} placeholder="Search PDF materials" />
        </div>
        {selectedPdfs.length > 0 && (
          <button className="admin-primary-button compact" onClick={onBulk}>
            <Download size={15} /> Download {selectedPdfs.length} selected
          </button>
        )}
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={pdfs.length > 0 && selectedPdfs.length === pdfs.length} onChange={() => pdfs.forEach((pdf) => togglePdf(pdf.id))} aria-label="Select all PDFs" /></th>
              <th>Material</th><th>Class</th><th>Subject</th><th>Chapter</th><th>Size</th><th>Updated</th><th />
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="8"><LoadingRows /></td></tr> : pdfs.map((pdf) => (
              <tr key={pdf.id}>
                <td><input type="checkbox" checked={selectedPdfs.includes(pdf.id)} onChange={() => togglePdf(pdf.id)} aria-label={`Select ${pdf.name}`} /></td>
                <td>
                  <button className="admin-table-title" onClick={() => onPreview(pdf)}>
                    <span className="admin-pdf-icon"><FileText size={16} /></span>
                    <strong>{pdf.name}</strong>
                  </button>
                </td>
                <td>{pdf.class_name}</td>
                <td>{pdf.subject_name}</td>
                <td>{pdf.chapter_name}</td>
                <td>{pdf.file_size}</td>
                <td>{pdf.updated_at}</td>
                <td>
                  <div className="admin-row-actions">
                    <button title="Modify / Replace PDF for this Subject" onClick={() => onEditPdf(pdf)}><Edit size={16} /></button>
                    <button title="Preview PDF" onClick={() => onPreview(pdf)}><ChevronRight size={16} /></button>
                    <button title="Download PDF" onClick={() => onDownload(pdf.id)}><Download size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !pdfs.length && <EmptyState label="No PDF materials found." />}
      </div>
    </>
  );
}

function DownloadsView({ stats }) {
  const [downloadSearch, setDownloadSearch] = useState("");

  const downloadHistory = [
    { id: 1, name: "Class 10 Complete Archive.zip", type: "Class Bundle", size: "48.2 MB", date: "2026-08-24 18:30", status: "Completed", icon: Archive },
    { id: 2, name: "Mathematics Chapter 1-5 PDFs.zip", type: "Subject Archive", size: "18.5 MB", date: "2026-08-24 16:15", status: "Completed", icon: Library },
    { id: 3, name: "Science Real Numbers Unit.pdf", type: "PDF Document", size: "4.1 MB", date: "2026-08-24 14:02", status: "Completed", icon: FileText },
    { id: 4, name: "Class 9 Physics Notes.zip", type: "Class Bundle", size: "32.0 MB", date: "2026-08-23 20:45", status: "Completed", icon: Archive },
  ];

  const filteredHistory = downloadHistory.filter((item) => item.name.toLowerCase().includes(downloadSearch.toLowerCase()));

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Operations</span>
          <h1>Downloads & Archives Log</h1>
          <p>Monitor system file distribution, bulk export archives, and generated ZIP packages.</p>
        </div>
      </div>

      <section className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Download size={18} /></div>
          <span>Total downloads</span>
          <strong>{stats.total_downloads || "142"}</strong>
          <small>Across all students & admins</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Archive size={18} /></div>
          <span>Storage used</span>
          <strong>{stats.storage_used || "128 MB"}</strong>
          <small>Optimized ZIP archives</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Library size={18} /></div>
          <span>PDF materials</span>
          <strong>{stats.total_pdfs || "0"}</strong>
          <small>Ready for download</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><ShieldCheck size={18} /></div>
          <span>Archive service</span>
          <strong>Active</strong>
          <small>Secure CDN links</small>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            value={downloadSearch}
            onChange={(e) => setDownloadSearch(e.target.value)}
            placeholder="Search downloads history"
          />
        </div>
        <span className="admin-result-count">{filteredHistory.length} archives logged</span>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>File / Package Name</th>
              <th>Category</th>
              <th>File Size</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((item) => {
              const ItemIcon = item.icon;
              return (
                <tr key={item.id}>
                  <td>
                    <div className="admin-table-title">
                      <span className="admin-pdf-icon"><ItemIcon size={16} /></span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.size}</td>
                  <td>{item.date}</td>
                  <td><span className="admin-pill available">{item.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <button title="Re-download archive"><Download size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersView() {
  const [userSearch, setUserSearch] = useState("");
  const users = [
    { id: 1, name: "Admin User", email: "admin@adhyayanguru.com", role: "Administrator", status: "Active", initials: "AD" },
    { id: 2, name: "Rajesh Sharma", email: "rajesh.student@gmail.com", role: "Student", status: "Active", initials: "RS" },
    { id: 3, name: "Priya Verma", email: "priya.parent@gmail.com", role: "Parent", status: "Active", initials: "PV" },
    { id: 4, name: "Anand Kumar", email: "anand.student@gmail.com", role: "Student", status: "Active", initials: "AK" },
    { id: 5, name: "Sunita Gupta", email: "sunita.teacher@gmail.com", role: "Content Manager", status: "Active", initials: "SG" },
  ];

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Access Control</span>
          <h1>User Management</h1>
          <p>Manage user accounts, admin access privileges, and student & parent profiles.</p>
        </div>
        <button className="admin-primary-button">
          <Plus size={16} /> Add new user
        </button>
      </div>

      <section className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Users size={18} /></div>
          <span>Total registered users</span>
          <strong>{users.length}</strong>
          <small>Active user accounts</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><ShieldCheck size={18} /></div>
          <span>Administrators</span>
          <strong>1</strong>
          <small>Full system access</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><BookOpen size={18} /></div>
          <span>Students</span>
          <strong>2</strong>
          <small>Learning dashboard access</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Users size={18} /></div>
          <span>Parents</span>
          <strong>1</strong>
          <small>Progress tracking access</small>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={17} />
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name or email"
          />
        </div>
        <span className="admin-result-count">{filteredUsers.length} users</span>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email Address</th>
              <th>System Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin-user">
                    <div className="admin-user-avatar" style={{ background: user.role === "Administrator" ? "#e26d4d" : "#42537a" }}>
                      {user.initials}
                    </div>
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`admin-pill ${user.role === "Administrator" ? "available" : "pending"}`}>
                    {user.role}
                  </span>
                </td>
                <td><span className="admin-pill available">{user.status}</span></td>
                <td>
                  <div className="admin-row-actions">
                    <button title="View user details"><ChevronRight size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SettingsView() {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Configuration</span>
          <h1>System Settings</h1>
          <p>Configure AI processing models, file storage limits, and server API integrations.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginTop: "28px" }}>
        <div className="admin-stat-card" style={{ height: "auto", minHeight: "220px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div className="admin-stat-icon" style={{ margin: 0 }}><Sparkles size={18} /></div>
            <div>
              <strong style={{ fontSize: "16px" }}>Gemini 3.5 AI Engine</strong>
              <small>Automated PDF extraction & question synthesis</small>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>Active AI Model:</span>
              <strong>Gemini 3.5 Flash</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>API Status:</span>
              <span className="admin-pill available">Connected</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "#718096" }}>API Key:</span>
              <span style={{ fontFamily: "monospace" }}>••••••••••••GEMINI</span>
            </div>
          </div>
        </div>

        <div className="admin-stat-card" style={{ height: "auto", minHeight: "220px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div className="admin-stat-icon" style={{ margin: 0 }}><Archive size={18} /></div>
            <div>
              <strong style={{ fontSize: "16px" }}>Storage & File Limits</strong>
              <span style={{ display: "block", fontSize: "11px", color: "#718096" }}>Upload configuration for chapter materials</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>Max Upload Size:</span>
              <strong>15 MB</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>Base64 Transfer Fallback:</span>
              <span className="admin-pill available">Enabled</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "#718096" }}>Supported Formats:</span>
              <strong>PDF (.pdf)</strong>
            </div>
          </div>
        </div>

        <div className="admin-stat-card" style={{ height: "auto", minHeight: "220px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div className="admin-stat-icon" style={{ margin: 0 }}><ShieldCheck size={18} /></div>
            <div>
              <strong style={{ fontSize: "16px" }}>Backend API Server</strong>
              <span style={{ display: "block", fontSize: "11px", color: "#718096" }}>Laravel API endpoint & services</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>Base URL:</span>
              <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#718096" }}>Server Health:</span>
              <span className="admin-pill available">Operational</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "#718096" }}>Database Connection:</span>
              <span className="admin-pill available">MySQL / SQLite OK</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PreviewModal({ preview, onClose, onDownload }) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="admin-preview-header">
          <div>
            <span className="admin-kicker">PDF preview</span>
            <h2>{preview.pdf.name}</h2>
            <p>{preview.pdf.class_name} · {preview.pdf.subject_name} · {preview.pdf.file_size}</p>
          </div>
          <button className="admin-icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button>
        </div>
        <iframe className="admin-preview-frame" title={`Preview ${preview.pdf.name}`} src={preview.fileUrl} />
        <div className="admin-preview-footer">
          <button className="admin-secondary-button" onClick={onClose}>Close</button>
          <button className="admin-primary-button" onClick={onDownload}><Download size={16} /> Download PDF</button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  editingPdf,
  classes,
  classId,
  setClassId,
  subjectId,
  setSubjectId,
  subjects,
  chapterNumber,
  setChapterNumber,
  title,
  setTitle,
  file,
  onFileChange,
  isUploading,
  error,
  showAddSubject,
  setShowAddSubject,
  newSubjectName,
  setNewSubjectName,
  isCreatingSubject,
  onCreateSubject,
  onClose,
  onSubmit,
  onOpenFullEngine
}) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <div className="admin-preview-header">
          <div>
            <span className="admin-kicker">{editingPdf ? "Modify Subject PDF" : "Content Upload"}</span>
            <h2>{editingPdf ? `Modify PDF Material` : "Upload Chapter PDF Material"}</h2>
            <p>{editingPdf ? `Updating PDF material for ${editingPdf.subject_name || "selected subject"}. Choose a new PDF file or modify details.` : "Select Class and Subject, define Chapter # and Title, then upload your PDF."}</p>
          </div>
          <button className="admin-icon-button" onClick={onClose} aria-label="Close upload modal"><X size={19} /></button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: "24px" }}>
          {error && (
            <div className="admin-alert" style={{ marginBottom: "16px" }}>
              <X size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px", color: "#687386" }}>
                Class Level *
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #e5e8ed", fontSize: "13px", background: "#fff" }}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#687386" }}>
                  Subject *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(!showAddSubject)}
                  style={{ background: "none", border: "none", color: "#b45309", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Plus size={13} /> {showAddSubject ? "Cancel Subject" : "+ Insert New Subject"}
                </button>
              </div>

              {showAddSubject ? (
                <div style={{ display: "flex", gap: "8px", background: "#fffbeb", padding: "12px", borderRadius: "7px", border: "1px solid #fcd34d", marginBottom: "8px" }}>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Enter new subject name (e.g. Science)"
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "5px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    onClick={onCreateSubject}
                    disabled={isCreatingSubject || !newSubjectName.trim()}
                    style={{ background: "#b45309", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "5px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                  >
                    {isCreatingSubject ? "Saving..." : "Save Subject"}
                  </button>
                </div>
              ) : (
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #e5e8ed", fontSize: "13px", background: "#fff" }}
                  disabled={!classId || subjects.length === 0}
                  required
                >
                  {!classId ? (
                    <option value="">Select a class first</option>
                  ) : subjects.length === 0 ? (
                    <option value="">No subjects found for this class</option>
                  ) : (
                    subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px", color: "#687386" }}>
                  Chapter # *
                </label>
                <input
                  type="number"
                  min="1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder="1"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #e5e8ed", fontSize: "13px" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px", color: "#687386" }}>
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Real Numbers"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "7px", border: "1px solid #e5e8ed", fontSize: "13px" }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px", color: "#687386" }}>
                {editingPdf ? "Replacement PDF Document (Max 15MB)" : "PDF Document (Max 15MB) *"}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #e5e8ed", fontSize: "13px", background: "#fff" }}
                required={!editingPdf}
              />
              {file ? (
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#25805c", fontWeight: "500" }}>
                  ✓ Selected replacement: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : editingPdf ? (
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#687386" }}>
                  Current File: <strong>{editingPdf.name}</strong>. Choose a new file above to replace this material.
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e5e8ed" }}>
            <button
              type="button"
              className="admin-link-button"
              onClick={onOpenFullEngine}
              style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Sparkles size={14} /> Full AI Ingestion Engine
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="admin-secondary-button" onClick={onClose} disabled={isUploading}>
                Cancel
              </button>
              <button type="submit" className="admin-primary-button" disabled={isUploading || (!subjectId && !showAddSubject)}>
                {isUploading ? (editingPdf ? "Saving Changes..." : "Uploading...") : (editingPdf ? "Update Subject PDF" : "Upload Material")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ label }) { return <div className="admin-empty-state"><FolderOpen size={22} /><span>{label}</span></div>; }
function LoadingRows() { return <div className="admin-loading"><span /><span /><span /></div>; }
