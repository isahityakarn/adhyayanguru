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
    body: JSON.stringify(body),
  });
}
