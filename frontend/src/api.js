const TOKEN_KEY = "officecloset_token";

function getEnv() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

const API_BASE = (getEnv().VITE_API_URL || "http://localhost:8000").replace(
  /\/+$/,
  "",
);

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Storage unavailable (e.g. privacy mode) — the session is simply not persisted.
  }
}

async function request(path, { method = "GET", body, headers = {}, isForm = false } = {}) {
  const token = getToken();
  const finalHeaders = { ...headers };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }
  if (body && !isForm) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body && !isForm ? JSON.stringify(body) : body,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && data.detail
        ? data.detail
        : `Request failed (${response.status})`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return data;
}

function toFormData(fields) {
  const formData = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}

export function register(email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function listItems(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/api/items${query}`);
}

export function createItem({ name, category, image } = {}) {
  const formData = toFormData({ name, category, image });
  return request("/api/items", { method: "POST", body: formData, isForm: true });
}

export function updateItem(id, { name, category, image } = {}) {
  const formData = toFormData({ name, category, image });
  return request(`/api/items/${id}`, { method: "PUT", body: formData, isForm: true });
}

export function deleteItem(id) {
  return request(`/api/items/${id}`, { method: "DELETE" });
}

export function listOutfits() {
  return request("/api/outfits");
}

export function createOutfit({ name, item_ids } = {}) {
  return request("/api/outfits", {
    method: "POST",
    body: { name, item_ids },
  });
}

export function updateOutfit(id, { name, item_ids } = {}) {
  return request(`/api/outfits/${id}`, {
    method: "PUT",
    body: { name, item_ids },
  });
}

export function deleteOutfit(id) {
  return request(`/api/outfits/${id}`, { method: "DELETE" });
}

export function deleteAccount() {
  return request("/api/users/me", { method: "DELETE" });
}
