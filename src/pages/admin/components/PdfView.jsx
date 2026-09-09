import { useMemo } from "react";
import {
  BookOpen,
  ChevronRight,
  Download,
  Edit,
  FileText,
  Library,
  Search,
  Upload,
  X,
} from "lucide-react";
import getSubjectTheme from "./getSubjectTheme";
import LoadingRows from "./LoadingRows";
import EmptyState from "./EmptyState";

export default function PdfView({
  pdfs,
  classes,
  pdfClassFilter,
  setPdfClassFilter,
  loading,
  search,
  setSearch,
  selectedPdfs,
  togglePdf,
  onPreview,
  onDownload,
  onBulk,
  onOpenUploadModal,
  onEditPdf,
}) {
  const displayPdfs = useMemo(() => {
    if (!pdfClassFilter) return pdfs;
    return pdfs.filter(
      (pdf) =>
        String(pdf.class_id) === String(pdfClassFilter.id) ||
        (pdf.class_name &&
          pdf.class_name
            .toLowerCase()
            .includes(pdfClassFilter.name.toLowerCase())),
    );
  }, [pdfs, pdfClassFilter]);

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Content library</span>
          <h1>PDF Materials Repository</h1>
          <p>
            {pdfClassFilter
              ? `Showing materials & chapters for ${pdfClassFilter.name}.`
              : "Preview, modify, update, and manage the PDF resources powering every class chapter."}
          </p>
        </div>
        <button
          className="admin-primary-button"
          onClick={() => onOpenUploadModal(pdfClassFilter?.id)}
        >
          <Upload size={16} /> Upload PDF
        </button>
      </div>

      {pdfClassFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            background: "#eff6ff",
            padding: "12px 18px",
            borderRadius: "9px",
            border: "1px solid #bfdbfe",
          }}
        >
          <BookOpen size={18} color="#1d4ed8" />
          <span
            style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}
          >
            Class Filter Active: Displaying PDF materials for{" "}
            <strong>{pdfClassFilter.name}</strong> ({displayPdfs.length} files
            found)
          </span>
          <button
            onClick={() => setPdfClassFilter(null)}
            style={{
              marginLeft: "auto",
              background: "#dbeafe",
              border: "none",
              color: "#1e40af",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X size={14} /> Clear Filter (Show All Classes)
          </button>
        </div>
      )}

      <section className="admin-stat-grid" style={{ marginBottom: "24px" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Library size={18} />
          </div>
          <span>Total PDF Files</span>
          <strong>{displayPdfs.length}</strong>
          <small>{pdfClassFilter ? pdfClassFilter.name : "All classes"}</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <BookOpen size={18} />
          </div>
          <span>Classes Covered</span>
          <strong>
            {pdfClassFilter ? "1 Class Selected" : "12 Grade Levels"}
          </strong>
          <small>Filtered view</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FileText size={18} />
          </div>
          <span>Chapter Materials</span>
          <strong>{displayPdfs.length}</strong>
          <small>Extracted & Ready</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Download size={18} />
          </div>
          <span>Bulk Export</span>
          <strong>Enabled</strong>
          <small>ZIP download ready</small>
        </div>
      </section>

      <div
        className="admin-toolbar"
        style={{ display: "flex", gap: "12px", alignItems: "center" }}
      >
        <div className="admin-search" style={{ flex: 1 }}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && setSearch(event.target.value)
            }
            placeholder="Search PDF materials..."
          />
        </div>

        <select
          value={pdfClassFilter?.id || ""}
          onChange={(e) => {
            const clsId = e.target.value;
            if (!clsId) {
              setPdfClassFilter(null);
            } else {
              const found = classes.find((c) => String(c.id) === String(clsId));
              setPdfClassFilter(found || { id: clsId, name: `Class ${clsId}` });
            }
          }}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #e5e8ed",
            fontSize: "13px",
            background: "#fff",
            fontWeight: "600",
            color: "#334155",
            minWidth: "200px",
          }}
        >
          <option value="">All Classes (Show All Materials)</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

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
              <th>
                <input
                  type="checkbox"
                  checked={
                    displayPdfs.length > 0 &&
                    selectedPdfs.length === displayPdfs.length
                  }
                  onChange={() =>
                    displayPdfs.forEach((pdf) => togglePdf(pdf.id))
                  }
                  aria-label="Select all PDFs"
                />
              </th>
              <th>Material Name</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Chapter #</th>
              <th>Chapter Title</th>
              <th>Size</th>
              <th>Updated</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">
                  <LoadingRows />
                </td>
              </tr>
            ) : (
              displayPdfs.map((pdf) => {
                const chapterNo =
                  pdf.chapter_number || pdf.chapter_no || pdf.chapter_id || "1";
                const theme = getSubjectTheme(pdf.subject_name, chapterNo);
                return (
                  <tr key={pdf.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPdfs.includes(pdf.id)}
                        onChange={() => togglePdf(pdf.id)}
                        aria-label={`Select ${pdf.name}`}
                      />
                    </td>
                    <td>
                      <button
                        className="admin-table-title"
                        onClick={() => onPreview(pdf)}
                      >
                        <span
                          className="admin-pdf-icon"
                          style={{
                            background: theme.subBg,
                            color: theme.subColor,
                          }}
                        >
                          <FileText size={16} />
                        </span>
                        <strong>{pdf.name}</strong>
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: "600", color: "#475569" }}>
                        {pdf.class_name}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: theme.subBg,
                          color: theme.subColor,
                          border: `1px solid ${theme.subBorder}`,
                        }}
                      >
                        {pdf.subject_name || "General"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "800",
                          background: theme.chapBg,
                          color: theme.chapColor,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                          letterSpacing: "0.3px",
                        }}
                      >
                        Ch {chapterNo}
                      </span>
                    </td>
                    <td>
                      <strong>{pdf.chapter_name || pdf.name}</strong>
                    </td>
                    <td>{pdf.file_size}</td>
                    <td>{pdf.updated_at}</td>
                    <td>
                      <div
                        className="admin-row-actions"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          title="Modify / Replace PDF for this Subject"
                          onClick={() => onEditPdf(pdf)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          title="Preview PDF"
                          onClick={() => onPreview(pdf)}
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          title="Download PDF"
                          onClick={() => onDownload(pdf.id)}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && !displayPdfs.length && (
          <EmptyState
            label={
              pdfClassFilter
                ? `No PDF materials found for ${pdfClassFilter.name}.`
                : "No PDF materials found."
            }
          />
        )}
      </div>
    </>
  );
}
