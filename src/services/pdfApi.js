import { del, downloadFile, get, getFileUrl, post, put } from "../utils/api";

export function getPdfs(params = {}) { return get(`/admin/pdfs?${new URLSearchParams(params)}`); }
export function previewPdf(pdfId) { return get(`/admin/pdfs/${pdfId}/preview`); }
export function previewPdfFile(pdfId) { return getFileUrl(`/admin/pdfs/${pdfId}/preview/file`); }
export function downloadPdf(pdfId) { return downloadFile(`/admin/pdfs/${pdfId}/download`); }
export function bulkDownloadPdfs(pdfIds) { return post("/admin/pdfs/bulk-download", { pdf_ids: pdfIds }); }
export function uploadPdf(formData) { return post("/admin/pdfs", formData); }
export function updatePdf(pdfId, data) { return put(`/admin/pdfs/${pdfId}`, data); }
export function deletePdf(pdfId) { return del(`/admin/pdfs/${pdfId}`); }