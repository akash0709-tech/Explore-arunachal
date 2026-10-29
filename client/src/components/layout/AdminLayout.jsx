import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../../api/admin.js";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/approvals", label: "Approvals", count: "pending" },
  { to: "/admin/hosts", label: "Hosts" },
  { to: "/admin/permits", label: "Permit data" },
  { to: "/admin/reports", label: "Reports", count: "reports" }
];

export function AdminLayout() {
  const dashboard = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });
  return (
    <div className="admin-shell">
      <nav className="admin-side-nav" aria-label="Admin sections">
        {LINKS.map(({ to, label, count, end }) => {
          const value = count === "pending"
            ? dashboard.data?.counts?.pending
            : count === "reports" ? dashboard.data?.openReports : undefined;
          return (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-side-nav__link${isActive ? " is-active" : ""}`}>
              <span>{label}</span>
              {value > 0 && <span className="admin-nav-count">{value}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="admin-page"><Outlet /></div>
    </div>
  );
}
