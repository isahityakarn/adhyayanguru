import { get, post, put } from "../utils/api";

export function getSubjectChapters(subjectId, params = {}) { return get(`/admin/subjects/${subjectId}/chapters?${new URLSearchParams(params)}`); }
export function bulkDownloadSubject(subjectId) { return post(`/admin/subjects/${subjectId}/bulk-download`); }
export function updateSubject(subjectId, data) { return put(`/admin/subjects/${subjectId}`, data); }