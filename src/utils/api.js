const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getAuthToken() {
  return localStorage.getItem("studyyodha_token");
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    if (response.status === 401 && token) {
      localStorage.removeItem("studyyodha_token");
      localStorage.removeItem("studyyodha_user");
      localStorage.removeItem("studyyodha_user_role");
      window.location.assign("/login");
    }
    const error = new Error(errorBody?.message || `Request failed with status ${response.status}`);
    error.errors = errorBody?.errors || {};
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export function get(path, options = {}) {
  return request(path, { ...options, method: "GET" });
}

export function post(path, body, options = {}) {
  return request(path, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
  });
}

export function put(path, body, options = {}) {
  return request(path, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del(path, options = {}) {
  return request(path, { ...options, method: "DELETE" });
}

export async function downloadFile(path) {
  const token = getAuthToken();
  const response = await fetch(buildUrl(path), {
    headers: { Accept: "application/pdf, application/zip", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "download";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getFileUrl(path) {
  const token = getAuthToken();
  const response = await fetch(buildUrl(path), { headers: { Accept: "application/pdf", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error(`Preview failed with status ${response.status}`);
  return URL.createObjectURL(await response.blob());
}

