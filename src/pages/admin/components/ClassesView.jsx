import { ChevronRight, Download, Search, Upload } from "lucide-react";
import LoadingRows from "./LoadingRows";
import EmptyState from "./EmptyState";

export default function ClassesView({
  classes,
  loading,
  search,
  setSearch,
  onClass,
  onDownload,
  onOpenUploadModal,
}) {
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
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search classes"
          />
        </div>
        <span className="admin-result-count">{classes.length} classes</span>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Subjects</th>
              <th>Chapters</th>
              <th>PDFs</th>
              <th>Last updated</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">
                  <LoadingRows />
                </td>
              </tr>
            ) : (
              classes.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button
                      className="admin-table-title"
                      onClick={() => onClass(item)}
                    >
                      <span className="admin-class-number small">
                        {item.name.replace("Class ", "")}
                      </span>
                      <strong>{item.name}</strong>
                    </button>
                  </td>
                  <td>{item.subject_count}</td>
                  <td>{item.chapter_count}</td>
                  <td className="admin-strong-cell">{item.pdf_count}</td>
                  <td>{item.last_updated || "Not yet"}</td>
                  <td>
                    <span
                      className={`admin-pill ${item.pdf_available ? "available" : "pending"}`}
                    >
                      {item.pdf_available ? "Available" : "Needs material"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        title="Upload / Modify PDF for Class"
                        onClick={() => onOpenUploadModal(item.id)}
                      >
                        <Upload size={16} />
                      </button>
                      <button title="View class" onClick={() => onClass(item)}>
                        <ChevronRight size={16} />
                      </button>
                      <button
                        title="Download all"
                        onClick={() => onDownload(item.id)}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !classes.length && (
          <EmptyState label="No classes match this search." />
        )}
      </div>
    </>
  );
}
