import axios from "axios";

const ADMIN_KEY_STORAGE = "familyShield_adminKey";

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
  const key = sessionStorage.getItem(ADMIN_KEY_STORAGE);
  if (key) {
    config.headers["x-admin-key"] = key;
  }
  return config;
});

export function saveAdminKey(key) {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function getAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function clearAdminKey() {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

export default adminApi;
