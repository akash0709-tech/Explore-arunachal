import { useContext } from "react";
import { AuthContext } from "../context/contexts.js";

/** The logged-in user and auth actions. Must be used inside <AuthProvider>. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Where each role lands after logging in */
export const homeForRole = (role) => ({ admin: "/admin", host: "/host" })[role] ?? "/";
