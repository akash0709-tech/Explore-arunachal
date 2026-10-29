// Dark teal top bar: logo, links for the current role, online/offline dot, and the
// user menu (or "Log in" for guests). On phones the links fold into a menu button.
import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "./Logo.jsx";
import { UserMenu } from "./UserMenu.jsx";
import { ButtonLink } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";
import { useOfflineTripCache } from "../../hooks/useOfflineTripCache.js";

const TRAVEL_LINKS = [
  { to: "/permit", label: "Permits" },
  { to: "/plan", label: "Plan a trip" },
  { to: "/stays", label: "Stays" }
];

const NAV_BY_ROLE = {
  guest: TRAVEL_LINKS,
  traveller: [...TRAVEL_LINKS, { to: "/saved", label: "Saved trips" }],
  host: [
    { to: "/host", label: "Dashboard", end: true },
    { to: "/host/register", label: "Add homestay" },
    { to: "/stays", label: "Stays" }
  ],
  admin: [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/approvals", label: "Approvals" },
    { to: "/admin/hosts", label: "Hosts" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/permits", label: "Permits" }
  ]
};

function NetworkStatus() {
  const online = useOnlineStatus();
  return (
    <span className="net-status" data-online={online} role="status">
      <span className="net-status__dot" aria-hidden="true" />
      {/* On phones the word is hidden visually but still read by screen readers */}
      <span className="net-status__label">{online ? "Online" : "Offline"}</span>
    </span>
  );
}

export function TopBar() {
  const { user, role, isLoading } = useAuth();
  const { pathname } = useLocation();
  const online = useOnlineStatus();
  const { available: hasOfflineTrips } = useOfflineTripCache();
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const offlineTraveller = !user && !online && hasOfflineTrips;
  const links = NAV_BY_ROLE[role ?? (offlineTraveller ? "traveller" : "guest")];

  useEffect(() => setMenuOpen(false), [pathname]); // close the phone menu after navigating

  return (
    <div className="topbar on-band">
      <div className="container topbar__inner">
        <Logo />

        <nav id={navId} className="topbar__nav" data-open={menuOpen} aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="topbar__link">
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar__end">
          <NetworkStatus />
          {isLoading ? (
            <Skeleton width={88} height={36} radius={999} />
          ) : user ? (
            <UserMenu />
          ) : offlineTraveller ? (
            <span className="topbar__offline-label">Offline trip access</span>
          ) : (
            <ButtonLink to="/login" size="sm">
              Log in
            </ButtonLink>
          )}
          <button
            type="button"
            className="icon-btn topbar__menu-btn"
            aria-expanded={menuOpen}
            aria-controls={navId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>
    </div>
  );
}
