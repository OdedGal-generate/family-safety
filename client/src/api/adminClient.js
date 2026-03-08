import axios from "axios";

const TOKEN_KEY = "familyShield_adminToken";

// Resolve base URL same as client.js, but target /api/admin
let baseURL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
if (baseURL !== "/api" && !baseURL.endsWith("/api")) {
  baseURL += "/api";
}
baseURL += "/admin";

const adminApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export function saveAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Backward-compat aliases (used in AdminDashboard)
export const getAdminKey = getAdminToken;
export const saveAdminKey = saveAdminToken;
export const clearAdminKey = clearAdminToken;

export default adminApi;
