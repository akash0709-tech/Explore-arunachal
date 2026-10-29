import { useContext } from "react";
import { ToastContext } from "../context/contexts.js";

/** { toast, dismiss }. Must be used inside <ToastProvider>. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
