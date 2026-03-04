import axios from "axios";

const TOKEN_KEY = "familyShield_token";
const USER_KEY = "familyShield_user";
const GROUP_KEY = "familyShield_groupId";

// Resolve API base URL — auto-append /api if the env var doesn't include it
let resolvedBaseURL = import.meta.env.VITE_API_URL || "/api";
if (resolvedBaseURL !== "/api" && !resolvedBaseURL.endsWith("/api")) {
  resolvedBaseURL = resolvedBaseURL.replace(/\/+$/, "") + "/api";
}

console.log("[API] baseURL:", resolvedBaseURL);

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log errors to console
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API]", err.response?.status, err.response?.data || err.message);
    return Promise.reject(err);
  }
);

// Auth helpers
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveGroupId(id) {
  localStorage.setItem(GROUP_KEY, String(id));
}

export function getGroupId() {
  return Number(localStorage.getItem(GROUP_KEY)) || null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GROUP_KEY);
}

export function isLoggedIn() {
  return !!getToken() && !!getGroupId();
}

export default api;
