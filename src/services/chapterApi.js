import { get, put } from "../utils/api";

export function getChapters(subjectId, params = {}) { return get(`/admin/subjects/${subjectId}/chapters?${new URLSearchParams(params)}`); }
export function updateChapter(chapterId, data) { return put(`/admin/chapters/${chapterId}`, data); }