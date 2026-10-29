// The one axios instance the whole app uses.
//
// Auth lives ONLY in httpOnly cookies set by the API. The browser sends them
// automatically (withCredentials). Nothing is ever stored in localStorage or
// sessionStorage, and JavaScript never sees a token.
//
// When the 15-minute access cookie expires, the API answers 401. Then we:
//   1. call POST /auth/refresh ONCE (parallel requests wait for that same call),
//   2. retry the original request,
//   3. if the refresh fails: clear cached data and go to /login.
import axios from "axios";
import { resetSessionData } from "./queryClient.js";
import { notifySessionExpired } from "./sessionEvents.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  timeout: 20_000
});

// Auth endpoints that must never trigger the refresh dance themselves
const NO_REFRESH = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/otp/",
  "/auth/password/"
];
const skipsRefresh = (url = "") => NO_REFRESH.some((path) => url.startsWith(path));

let refreshPromise = null; // shared by every request that hits a 401 at the same time

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post("/auth/refresh").finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retried || skipsRefresh(original.url)) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      await refreshSession(); // new cookies are set by the API
      return api(original); // try again, once
    } catch (refreshError) {
      resetSessionData();
      // Requests marked authOptional (e.g. "who am I?" on page load) fail quietly for guests
      if (!original.authOptional) notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

/** Every API response is { success, data, message }; most callers only need data. */
export const unwrap = (response) => response.data.data;
