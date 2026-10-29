// A tiny event channel between the axios interceptor (plain JS) and React.
// When the session cannot be refreshed, axios calls notifySessionExpired();
// AuthProvider listens and sends the user to /login with a toast.

const listeners = new Set();

export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySessionExpired() {
  if (listeners.size === 0) {
    // Nobody is listening (should not happen): fall back to a full page load
    window.location.assign("/login");
    return;
  }
  listeners.forEach((listener) => listener());
}
