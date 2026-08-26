function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Live production site host
  if (currentHost.includes("adhyayanguru.shop")) {
    return "https://adhyayanguruapi.adhyayanguru.shop/api";
  }

  // Explicit remote backend set in env
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // Local Wi-Fi network testing on mobile phone
  if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
    return `http://${currentHost}:8000/api`;
  }

  return envUrl || "http://localhost:8000/api";
}

export const API_BASE_URL = getApiBaseUrl();

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getAuthToken() {
  return localStorage.getItem("studyyodha_token");
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const url = buildUrl(path);
  let response;

  try {
    response = await fetch(url, {
      mode: "cors",
      ...options,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (networkErr) {
    throw new Error(`Network/CORS connection failed to API: ${url}`);
  }

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
  const isFormData = body instanceof FormData;
  const headers = { ...options.headers };
  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else if (!headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  return request(path, {
    ...options,
    method: "POST",
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });
}

export function put(path, body, options = {}) {
  const isFormData = body instanceof FormData;
  const headers = { ...options.headers };
  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else if (!headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  return request(path, {
    ...options,
    method: "PUT",
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
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

