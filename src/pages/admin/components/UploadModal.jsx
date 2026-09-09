import { Plus, Sparkles, X } from "lucide-react";

export default function UploadModal({
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
  onOpenFullEngine,
}) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-preview-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px" }}
      >
        <div className="admin-preview-header">
          <div>
            <span className="admin-kicker">
              {editingPdf ? "Modify Subject PDF" : "Content Upload"}
            </span>
            <h2>
              {editingPdf
                ? "Modify PDF Material"
                : "Upload Chapter PDF Material"}
            </h2>
            <p>
              {editingPdf
                ? `Updating PDF material for ${editingPdf.subject_name || "selected subject"}. Choose a new PDF file or modify details.`
                : "Select Class and Subject, define Chapter # and Title, then upload your PDF."}
            </p>
          </div>
          <button
            className="admin-icon-button"
            onClick={onClose}
            aria-label="Close upload modal"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: "24px" }}>
          {error && (
            <div className="admin-alert" style={{ marginBottom: "16px" }}>
              <X size={16} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Class Level */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  color: "#687386",
                }}
              >
                Class Level *
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "7px",
                  border: "1px solid #e5e8ed",
                  fontSize: "13px",
                  background: "#fff",
                }}
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

            {/* Subject */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "#687386",
                  }}
                >
                  Subject *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(!showAddSubject)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#b45309",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={13} />{" "}
                  {showAddSubject ? "Cancel Subject" : "+ Insert New Subject"}
                </button>
              </div>

              {showAddSubject ? (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    background: "#fffbeb",
                    padding: "12px",
                    borderRadius: "7px",
                    border: "1px solid #fcd34d",
                    marginBottom: "8px",
                  }}
                >
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Enter new subject name (e.g. Science)"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: "5px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={onCreateSubject}
                    disabled={isCreatingSubject || !newSubjectName.trim()}
                    style={{
                      background: "#b45309",
                      color: "#fff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "5px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {isCreatingSubject ? "Saving..." : "Save Subject"}
                  </button>
                </div>
              ) : (
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "7px",
                    border: "1px solid #e5e8ed",
                    fontSize: "13px",
                    background: "#fff",
                  }}
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

            {/* Chapter # and Title */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2.5fr",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    color: "#687386",
                  }}
                >
                  Chapter # *
                </label>
                <input
                  type="number"
                  min="1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder="1"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "7px",
                    border: "1px solid #e5e8ed",
                    fontSize: "13px",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    color: "#687386",
                  }}
                >
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Real Numbers"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "7px",
                    border: "1px solid #e5e8ed",
                    fontSize: "13px",
                  }}
                  required
                />
              </div>
            </div>

            {/* PDF File */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  color: "#687386",
                }}
              >
                {editingPdf
                  ? "Replacement PDF Document (Max 15MB)"
                  : "PDF Document (Max 15MB) *"}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: "1px solid #e5e8ed",
                  fontSize: "13px",
                  background: "#fff",
                }}
                required={!editingPdf}
              />
              {file ? (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#25805c",
                    fontWeight: "500",
                  }}
                >
                  ✓ Selected replacement: {file.name} (
                  {(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : editingPdf ? (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#687386",
                  }}
                >
                  Current File: <strong>{editingPdf.name}</strong>. Choose a new
                  file above to replace this material.
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e8ed",
            }}
          >
            <button
              type="button"
              className="admin-link-button"
              onClick={onOpenFullEngine}
              style={{
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={14} /> Full AI Ingestion Engine
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-primary-button"
                disabled={isUploading || (!subjectId && !showAddSubject)}
              >
                {isUploading
                  ? editingPdf
                    ? "Saving Changes..."
                    : "Uploading..."
                  : editingPdf
                    ? "Update Subject PDF"
                    : "Upload Material"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
