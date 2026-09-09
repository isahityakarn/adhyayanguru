import { Download, X } from "lucide-react";

export default function PreviewModal({ preview, onClose, onDownload }) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-preview-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-preview-header">
          <div>
            <span className="admin-kicker">PDF preview</span>
            <h2>{preview.pdf.name}</h2>
            <p>
              {preview.pdf.class_name} · {preview.pdf.subject_name} ·{" "}
              {preview.pdf.file_size}
            </p>
          </div>
          <button
            className="admin-icon-button"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={19} />
          </button>
        </div>
        <iframe
          className="admin-preview-frame"
          title={`Preview ${preview.pdf.name}`}
          src={preview.fileUrl}
        />
        <div className="admin-preview-footer">
          <button className="admin-secondary-button" onClick={onClose}>
            Close
          </button>
          <button className="admin-primary-button" onClick={onDownload}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
