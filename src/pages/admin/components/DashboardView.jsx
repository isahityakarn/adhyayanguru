import { BookOpen, ChevronRight, FileText, FolderOpen, Library, Upload } from "lucide-react";

export default function DashboardView({
  stats,
  classes,
  loading,
  onClasses,
  onPdfs,
  onClass,
  onOpenUploadModal,
}) {
  const cards = [
    ["Total classes", stats.total_classes, "12 grade levels", BookOpen],
    ["Total subjects", stats.total_subjects, "Across all classes", FolderOpen],
    ["Total chapters", stats.total_chapters, "Curriculum units", FileText],
    [
      "PDF materials",
      stats.total_pdfs,
      `${stats.storage_used} stored`,
      Library,
    ],
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Overview</span>
          <h1>Good morning, Admin.</h1>
          <p>
            Keep the learning library organized and ready for every classroom.
          </p>
        </div>
        <button
          className="admin-primary-button"
          onClick={() => onOpenUploadModal()}
        >
          <Upload size={16} /> Add / Modify Material
        </button>
      </div>

      <section className="admin-stat-grid">
        {cards.map(([label, value, hint, Icon]) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-icon">
              <Icon size={18} />
            </div>
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
        <button className="admin-link-button" onClick={onClasses}>
          View all classes <ChevronRight size={15} />
        </button>
      </div>

      <div className="admin-class-grid">
        {classes.slice(0, 6).map((item) => (
          <button
            className="admin-class-card"
            key={item.id}
            onClick={() => onClass(item)}
          >
            <div className="admin-class-number">
              {item.name.replace("Class ", "")}
            </div>
            <div>
              <strong>{item.name}</strong>
              <span>
                {item.subject_count} subjects · {item.pdf_count} PDFs
              </span>
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
        <button className="admin-link-button" onClick={onPdfs}>
          Open library <ChevronRight size={15} />
        </button>
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
