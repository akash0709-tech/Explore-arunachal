import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../api/admin.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { AdminQueryError, AdminStatus } from "../features/admin/AdminShared.jsx";
import { formatDate } from "../utils/format.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const STATS = [
  ["Pending", "pending", "warn"],
  ["Changes requested", "changes_requested", "bad"],
  ["Approved / Live", "live", "ok"],
  ["Rejected", "rejected", "mute"]
];

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });
  const data = query.data;
  return (
    <>
      <PageHeader eyebrow="Tourism review team" title="Admin dashboard" subtitle="Review homestays, keep permit rules current and respond to traveller reports." />
      <section className="container section admin-content">
        {query.isError && <AdminQueryError error={query.error} onRetry={() => query.refetch()} />}
        <div className="admin-stat-grid">
          {STATS.map(([label, status, tone]) => (
            <Link className="admin-stat-card" to={`/admin/approvals?status=${status}`} key={status}>
              <span>{label}</span><strong>{query.isLoading ? "—" : data?.counts?.[status] ?? 0}</strong>
              <Pill tone={tone}>Open queue</Pill>
            </Link>
          ))}
        </div>
        <div className="admin-dashboard-grid">
          <section className="admin-card admin-dashboard-oldest">
            <header className="admin-card__heading"><div><p className="page-header__eyebrow">Needs attention</p><h2>Oldest waiting</h2></div><ButtonLink size="sm" variant="ghost" to="/admin/approvals">All approvals</ButtonLink></header>
            {query.isLoading ? <p className="text-muted">Loading review queue…</p> : (data?.oldestPending?.length ?? 0) === 0 ? (
              <p className="text-muted">No listings are waiting for review.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Business</th><th>Submitted</th><th>Waiting</th><th /></tr></thead>
                  <tbody>{data.oldestPending.map((item) => (
                    <tr key={item._id}>
                      <td><strong>{item.name || "Untitled homestay"}</strong><small>{item.town?.name || "Town unavailable"}</small></td>
                      <td>{formatDate(item.submittedAt)}</td>
                      <td>{item.daysWaiting ?? 0} days {item.daysWaiting >= 3 && <Pill tone="bad">Over target</Pill>}</td>
                      <td><ButtonLink size="sm" to={`/admin/approvals/${item._id}`}>Review</ButtonLink></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section className="admin-card">
            <header className="admin-card__heading"><div><p className="page-header__eyebrow">Reference data</p><h2>Permit data freshness</h2></div><ButtonLink size="sm" variant="ghost" to="/admin/permits">Manage</ButtonLink></header>
            <div className="admin-freshness-list">
              {(data?.permits ?? []).map((rule) => (
                <div key={rule._id}><span><strong>{rule.code}</strong> · {rule.title}</span><Pill tone={rule.stale ? "warn" : "ok"}>{rule.stale ? "Older than 30 days" : "Fresh"}</Pill></div>
              ))}
              {!query.isLoading && !data?.permits?.length && <p className="text-muted">No permit rules found.</p>}
            </div>
            {query.isLoading && <p className="text-muted">Loading permit status…</p>}
          </section>
          <section className="admin-card admin-reports-teaser">
            <header className="admin-card__heading"><div><p className="page-header__eyebrow">Traveller safety</p><h2>Open traveller reports</h2></div><Pill tone={data?.openReports ? "warn" : "ok"}>{data?.openReports ?? "—"} open</Pill></header>
            <p className="text-muted">{data?.openReports ? "Reports are sorted oldest first so that none wait too long." : "There are no open traveller reports."}</p>
            <ButtonLink size="sm" variant="ghost" to="/admin/reports">Review reports</ButtonLink>
          </section>
        </div>
        {query.isError && <p className="admin-inline-error">{getErrorMessage(query.error)}</p>}
      </section>
    </>
  );
}
