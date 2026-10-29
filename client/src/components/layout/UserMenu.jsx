// The logged-in user's button in the top bar, with a small panel (role + log out).
// Closes on Escape or a click outside.
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon.jsx";
import { useAuth, homeForRole } from "../../hooks/useAuth.js";
import { usePwaInstall } from "../../hooks/usePwaInstall.js";

const ROLE_LABELS = { traveller: "Traveller", host: "Homestay host", admin: "Tourism review team" };

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export function UserMenu() {
  const { user, logout } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="user-menu__name">{user.name.split(" ")[0]}</span>
        <Icon name="chevronDown" size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            className="user-menu__panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="user-menu__meta">
              <strong>{user.name}</strong>
              <p className="text-small text-muted">{user.email}</p>
              <p className="text-small text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <Link className="user-menu__item" to={homeForRole(user.role)} onClick={() => setOpen(false)}>
              <Icon name="compass" size={18} /> My home
            </Link>
            {canInstall && (
              <button
                type="button"
                className="user-menu__item"
                onClick={async () => {
                  setOpen(false);
                  await install();
                }}
              >
                Install app
              </button>
            )}
            <button
              type="button"
              className="user-menu__item"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <Icon name="logout" size={18} /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
