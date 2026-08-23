import { get, post, put } from "../utils/api";

export function getClasses(params = {}) { return get(`/admin/classes?${new URLSearchParams(params)}`); }
export function getClassDetails(classId) { return get(`/admin/classes/${classId}`); }
export function getClassSubjects(classId, params = {}) { return get(`/admin/classes/${classId}/subjects?${new URLSearchParams(params)}`); }
export function bulkDownloadClass(classId) { return post(`/admin/classes/${classId}/bulk-download`); }
export function updateClass(classId, data) { return put(`/admin/classes/${classId}`, data); }