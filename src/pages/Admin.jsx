import { useEffect, useMemo, useState } from "react";
import { Archive, BookOpen, Check, ChevronRight, Download, FileText, FolderOpen, Grid2X2, Library, Menu, Search, ShieldCheck, Upload, Users, X } from "lucide-react";
import { getDashboardStats } from "../services/dashboardApi";
import { bulkDownloadClass, getClasses } from "../services/classApi";
import { bulkDownloadPdfs, downloadPdf, getPdfs, previewPdf, previewPdfFile, uploadPdf } from "../services/pdfApi";
import { downloadFile } from "../utils/api";

const navItems = [["dashboard", "Dashboard", Grid2X2], ["classes", "Classes", BookOpen], ["pdfs", "PDF Library", Library], ["downloads", "Downloads", Download], ["users", "Users", Users], ["settings", "Settings", ShieldCheck]];
const emptyStats = { total_classes: 0, total_subjects: 0, total_chapters: 0, total_pdfs: 0, total_downloads: 0, storage_used: "0 MB" };

export default function AdminPage() {
  const [section, setSection] = useState("dashboard");
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

  const loadDashboard = async () => {
    setLoading(true); setError("");
    try { const [statsResponse, classResponse] = await Promise.all([getDashboardStats(), getClasses({ per_page: 50 })]); setStats(statsResponse.data || emptyStats); setClasses(classResponse.data || []); }
    catch (requestError) { setError(requestError.message || "Unable to load dashboard data."); }
    finally { setLoading(false); }
  };
  const loadPdfs = async () => {
    setLoading(true); setError("");
    try { const response = await getPdfs({ per_page: 50, search }); setPdfs(response.data || []); }
    catch (requestError) { setError(requestError.message || "Unable to load PDF library."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (section === "pdfs") loadPdfs(); }, [section]);

  const visibleClasses = useMemo(() => classes.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [classes, search]);
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 3500); };
  const openClass = (item) => { setSelectedClass(item); setSection("classes"); };
  const togglePdf = (id) => setSelectedPdfs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const secureBulkDownload = async (response, message) => { await downloadFile(response.data.download_url.replace(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}`, "")); showNotice(message); };
  const handleBulkDownload = async () => { try { await secureBulkDownload(await bulkDownloadPdfs(selectedPdfs), "Your ZIP archive is ready."); setSelectedPdfs([]); } catch (requestError) { setError(requestError.message || "Bulk download failed."); } };
  const handleClassDownload = async (classId) => { try { await secureBulkDownload(await bulkDownloadClass(classId), "Class archive downloaded."); } catch (requestError) { setError(requestError.message || "Class download failed."); } };
  const openPreview = async (pdf) => { try { const [response, fileUrl] = await Promise.all([previewPdf(pdf.id), previewPdfFile(pdf.id)]); setPreview({ ...response.data, fileUrl, pdf }); } catch (requestError) { setError(requestError.message || "Preview unavailable."); } };
  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append("class_id", selectedClass?.id || classes[0]?.id || ""); form.append("subject_id", ""); form.append("name", file.name.replace(/\.pdf$/i, "")); form.append("file", file);
    try { await uploadPdf(form); showNotice("PDF uploaded successfully."); await loadDashboard(); if (section === "pdfs") await loadPdfs(); } catch (requestError) { setError(requestError.message || "Upload failed. Choose a class and subject first."); }
    event.target.value = "";
  };

  return <div className="admin-console">
    <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
      <div className="admin-brand"><div className="admin-brand-mark"><Archive size={19} /></div><div><strong>AdhyayanGuru</strong><span>Admin workspace</span></div><button className="admin-close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="admin-nav-label">Workspace</div>
      <nav>{navItems.map(([id, label, Icon]) => <button key={id} className={section === id ? "active" : ""} onClick={() => { setSection(id); setMobileNav(false); }}><Icon size={17} /><span>{label}</span>{id === "pdfs" && stats.total_pdfs > 0 && <small>{stats.total_pdfs}</small>}</button>)}</nav>
      <div className="admin-sidebar-foot"><div className="admin-status"><span /><div><strong>System operational</strong><small>All services online</small></div></div></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="admin-breadcrumb"><span>Admin</span><ChevronRight size={14} /><strong>{navItems.find(([id]) => id === section)?.[1] || "Dashboard"}</strong></div><div className="admin-user"><div className="admin-user-avatar">AD</div><div><strong>Administrator</strong><span>Content operations</span></div></div></header>
      <div className="admin-content">
        {error && <div className="admin-alert"><X size={16} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="admin-notice"><Check size={16} /><span>{notice}</span></div>}
        {section === "dashboard" && <DashboardView stats={stats} classes={classes} loading={loading} onClasses={() => setSection("classes")} onPdfs={() => setSection("pdfs")} onClass={openClass} />}
        {section === "classes" && <ClassesView classes={visibleClasses} loading={loading} search={search} setSearch={setSearch} onClass={openClass} onDownload={handleClassDownload} />}
        {section === "pdfs" && <PdfView pdfs={pdfs} loading={loading} search={search} setSearch={setSearch} selectedPdfs={selectedPdfs} togglePdf={togglePdf} onPreview={openPreview} onDownload={downloadPdf} onBulk={handleBulkDownload} onUpload={upload} />}
        {(section === "downloads" || section === "users" || section === "settings") && <EmptySection title={navItems.find(([id]) => id === section)?.[1]} />}
      </div>
    </main>
    {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} onDownload={() => downloadPdf(preview.pdf.id)} />}
  </div>;
}

function DashboardView({ stats, classes, loading, onClasses, onPdfs, onClass }) {
  const cards = [["Total classes", stats.total_classes, "12 grade levels", BookOpen], ["Total subjects", stats.total_subjects, "Across all classes", FolderOpen], ["Total chapters", stats.total_chapters, "Curriculum units", FileText], ["PDF materials", stats.total_pdfs, `${stats.storage_used} stored`, Library]];
  return <><div className="admin-page-heading"><div><span className="admin-kicker">Overview</span><h1>Good morning, Admin.</h1><p>Keep the learning library organized and ready for every classroom.</p></div><button className="admin-primary-button" onClick={onPdfs}><Upload size={16} /> Add material</button></div>
    <section className="admin-stat-grid">{cards.map(([label, value, hint, Icon]) => <div className="admin-stat-card" key={label}><div className="admin-stat-icon"><Icon size={18} /></div><span>{label}</span><strong>{loading ? "--" : value}</strong><small>{hint}</small></div>)}</section>
    <div className="admin-section-heading"><div><h2>Class coverage</h2><p>See how complete each grade-level library is.</p></div><button className="admin-link-button" onClick={onClasses}>View all classes <ChevronRight size={15} /></button></div>
    <div className="admin-class-grid">{classes.slice(0, 6).map((item) => <button className="admin-class-card" key={item.id} onClick={() => onClass(item)}><div className="admin-class-number">{item.name.replace("Class ", "")}</div><div><strong>{item.name}</strong><span>{item.subject_count} subjects · {item.pdf_count} PDFs</span></div><ChevronRight size={17} /></button>)}</div>
    <div className="admin-section-heading admin-section-heading-spaced"><div><h2>Library status</h2><p>Every resource is organized by class, subject, and chapter.</p></div><button className="admin-link-button" onClick={onPdfs}>Open library <ChevronRight size={15} /></button></div>
    <div className="admin-table-card"><div className="admin-table-empty"><Library size={25} /><strong>PDF library is connected to your curriculum.</strong><span>Preview, select, and distribute resources from one place.</span></div></div>
  </>;
}

function ClassesView({ classes, loading, search, setSearch, onClass, onDownload }) { return <><div className="admin-page-heading"><div><span className="admin-kicker">Curriculum</span><h1>All classes</h1><p>Manage material availability across Class 1 through Class 12.</p></div></div><div className="admin-toolbar"><div className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes" /></div><span className="admin-result-count">{classes.length} classes</span></div><div className="admin-table-card"><table className="admin-table"><thead><tr><th>Class</th><th>Subjects</th><th>Chapters</th><th>PDFs</th><th>Last updated</th><th>Status</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="7"><LoadingRows /></td></tr> : classes.map((item) => <tr key={item.id}><td><button className="admin-table-title" onClick={() => onClass(item)}><span className="admin-class-number small">{item.name.replace("Class ", "")}</span><strong>{item.name}</strong></button></td><td>{item.subject_count}</td><td>{item.chapter_count}</td><td className="admin-strong-cell">{item.pdf_count}</td><td>{item.last_updated || "Not yet"}</td><td><span className={`admin-pill ${item.pdf_available ? "available" : "pending"}`}>{item.pdf_available ? "Available" : "Needs material"}</span></td><td><div className="admin-row-actions"><button title="View class" onClick={() => onClass(item)}><ChevronRight size={16} /></button><button title="Download all" onClick={() => onDownload(item.id)}><Download size={16} /></button></div></td></tr>)}</tbody></table>{!loading && !classes.length && <EmptyState label="No classes match this search." />}</div></>; }
function PdfView({ pdfs, loading, search, setSearch, selectedPdfs, togglePdf, onPreview, onDownload, onBulk, onUpload }) { return <><div className="admin-page-heading"><div><span className="admin-kicker">Content library</span><h1>PDF materials</h1><p>Preview and distribute the resources powering every lesson.</p></div><label className="admin-primary-button"><Upload size={16} /> Upload PDF<input type="file" accept="application/pdf" onChange={onUpload} hidden /></label></div><div className="admin-toolbar"><div className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSearch(event.target.value)} placeholder="Search PDF materials" /></div>{selectedPdfs.length > 0 && <button className="admin-primary-button compact" onClick={onBulk}><Download size={15} /> Download {selectedPdfs.length} selected</button>}</div><div className="admin-table-card"><table className="admin-table"><thead><tr><th><input type="checkbox" checked={pdfs.length > 0 && selectedPdfs.length === pdfs.length} onChange={() => pdfs.forEach((pdf) => togglePdf(pdf.id))} aria-label="Select all PDFs" /></th><th>Material</th><th>Class</th><th>Subject</th><th>Chapter</th><th>Size</th><th>Updated</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="8"><LoadingRows /></td></tr> : pdfs.map((pdf) => <tr key={pdf.id}><td><input type="checkbox" checked={selectedPdfs.includes(pdf.id)} onChange={() => togglePdf(pdf.id)} aria-label={`Select ${pdf.name}`} /></td><td><button className="admin-table-title" onClick={() => onPreview(pdf)}><span className="admin-pdf-icon"><FileText size={16} /></span><strong>{pdf.name}</strong></button></td><td>{pdf.class_name}</td><td>{pdf.subject_name}</td><td>{pdf.chapter_name}</td><td>{pdf.file_size}</td><td>{pdf.updated_at}</td><td><div className="admin-row-actions"><button title="Preview PDF" onClick={() => onPreview(pdf)}><ChevronRight size={16} /></button><button title="Download PDF" onClick={() => onDownload(pdf.id)}><Download size={16} /></button></div></td></tr>)}</tbody></table>{!loading && !pdfs.length && <EmptyState label="No PDF materials found." />}</div></>; }

function PreviewModal({ preview, onClose, onDownload }) { return <div className="admin-modal-backdrop" role="presentation" onClick={onClose}><div className="admin-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="admin-preview-header"><div><span className="admin-kicker">PDF preview</span><h2>{preview.pdf.name}</h2><p>{preview.pdf.class_name} · {preview.pdf.subject_name} · {preview.pdf.file_size}</p></div><button className="admin-icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button></div><iframe className="admin-preview-frame" title={`Preview ${preview.pdf.name}`} src={preview.fileUrl} /><div className="admin-preview-footer"><button className="admin-secondary-button" onClick={onClose}>Close</button><button className="admin-primary-button" onClick={onDownload}><Download size={16} /> Download PDF</button></div></div></div>; }
function EmptySection({ title }) { return <div className="admin-empty-page"><ShieldCheck size={30} /><span className="admin-kicker">Coming next</span><h1>{title}</h1><p>This workspace is ready for the next operations module.</p></div>; }
function EmptyState({ label }) { return <div className="admin-empty-state"><FolderOpen size={22} /><span>{label}</span></div>; }
function LoadingRows() { return <div className="admin-loading"><span /><span /><span /></div>; }
