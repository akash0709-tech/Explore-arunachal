// Toast notifications that slide up from the bottom of the screen.
//   const { toast } = useToast();
//   toast({ title: "Trip saved", message: "It now works offline", tone: "ok" });
// tone: "ok" | "warn" | "bad" | "mute". Passing the same id replaces an existing toast
// (useful to avoid duplicates, e.g. id: "forbidden").
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ToastContext } from "./contexts.js";
import { Icon } from "../components/ui/Icon.jsx";

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 4500;

let counter = 0;
const nextId = () => `toast-${Date.now()}-${counter++}`;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    ({ id = nextId(), title, message, tone = "ok", duration = DEFAULT_DURATION_MS }) => {
      setToasts((list) =>
        [...list.filter((t) => t.id !== id), { id, title, message, tone }].slice(-MAX_VISIBLE)
      );
      clearTimeout(timers.current.get(id));
      if (duration)
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      return id;
    },
    [dismiss]
  );

  // Clear pending timers if the provider ever unmounts
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live: screen readers announce new toasts without moving focus */}
      <div className="toast-region" aria-live="polite" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.tone}`}
              role={t.tone === "bad" ? "alert" : undefined}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <div className="toast__body">
                {t.title && <p className="toast__title">{t.title}</p>}
                {t.message && <p className="toast__message">{t.message}</p>}
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
              >
                <Icon name="x" size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
