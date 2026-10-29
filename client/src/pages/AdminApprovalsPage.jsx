import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { bulkRemind, getAdminDashboard, listQueue } from "../api/admin.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { useDestinations } from "../features/destinations/useDestinationData.js";
import { AdminPagination, AdminQueryError, AdminStatus, AdminLoadingRows } from "../features/admin/AdminShared.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const STATUSES = ["pending", "changes_requested", "draft", "live", "rejected", "paused", "suspended"];
const STATUS_LABELS = {
  pending: "Pending",
  changes_requested: "Changes requested",
  draft: "Draft",
  live: "Live",
  rejected: "Rejected",
  paused: "Paused",
  suspended: "Suspended"
};
const NO_ROWS = [];

export default function AdminApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = STATUSES.includes(searchParams.get("status")) ? searchParams.get("status") : "pending";
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState("");
  const [town, setTown] = useState("");
  const [sort, setSort] = useState("oldest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const destinationsQuery = useDestinations();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const dashboardQuery = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });
  const queueQuery = useQuery({
    queryKey: ["admin", "queue", { status, q: debouncedQuery, town, sort, page }],
    queryFn: () => listQueue({ status, q: debouncedQuery || undefined, town: town || undefined, sort, page, limit: 20 })
  });
  const countResults = useQueries({
    queries: STATUSES.map((value) => ({
      queryKey: ["admin", "queue-count", value],
      queryFn: () => listQueue({ status: value, page: 1, limit: 1 }),
      staleTime: 30_000
    }))
  });
  const countQueries = Object.fromEntries(STATUSES.map((value, index) => [value, countResults[index]]));
  const reminders = useMutation({
    mutationFn: bulkRemind,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      setSelected([]);
      toast({ title: `${result.reminded?.length ?? 0} host(s) reminded`, message: result.skipped?.length ? `${result.skipped.length} listing(s) skipped.` : undefined });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not send reminders", message: getErrorMessage(error) })
  });
  const rows = queueQuery.data?.items ?? NO_ROWS;
  const visibleIds = useMemo(() => rows.map((row) => row._id), [rows]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [status, town, debouncedQuery, sort]);
  useEffect(() => {
    if (searchParams.get("status") !== status) {
      const next = new URLSearchParams(searchParams);
      next.set("status", status);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, status]);

  const toggleOne = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const allVisible = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const toggleVisible = () => setSelected((current) => allVisible
    ? current.filter((id) => !visibleIds.includes(id))
    : [...new Set([...current, ...visibleIds])]);

  return (
    <>
      <PageHeader eyebrow="Tourism review team" title="Approvals" subtitle="Search and triage homestays across every review status." />
      <section className="container section admin-content">
        <div className="admin-queue-toolbar">
          <label className="admin-search"><span className="sr-only">Search by business or phone</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, owner or phone" /></label>
          <label className="admin-filter-field"><span className="field__label">Town</span>
            <select className="input" value={town} onChange={(event) => setTown(event.target.value)}>
              <option value="">All towns</option>
              {(destinationsQuery.data ?? []).map((place) => <option key={place._id} value={place.slug}>{place.name}</option>)}
            </select>
          </label>
          <label className="admin-filter-field"><span className="field__label">Sort by</span>
            <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="oldest">Oldest first</option><option value="newest">Newest first</option>
            </select>
          </label>
        </div>
        <div className="admin-status-tabs" role="group" aria-label="Filter by listing status">
          {STATUSES.map((value) => (
            <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
              {STATUS_LABELS[value]} <span>{countQueries[value].data?.pagination?.total ?? dashboardQuery.data?.counts?.[value] ?? "…"}</span>
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="admin-bulk-bar">
            <strong>{selected.length} selected</strong>
            <Button loading={reminders.isPending} onClick={() => reminders.mutate(selected)}>Send document reminder</Button>
            <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}
        {queueQuery.isError ? <AdminQueryError error={queueQuery.error} onRetry={() => queueQuery.refetch()} /> : queueQuery.isLoading ? <AdminLoadingRows /> : rows.length === 0 ? (
          <div className="admin-card admin-empty"><h2>No {STATUS_LABELS[status].toLowerCase()} listings</h2><p>Try another status or search term.</p></div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table admin-approvals-table">
              <thead><tr>
                <th><input type="checkbox" aria-label="Select all rows on this page" checked={allVisible} onChange={toggleVisible} /></th>
                <th>Business</th><th>Owner</th><th>Documents</th><th>Status</th><th>Waiting</th><th />
              </tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row._id}>
                  <td><input type="checkbox" aria-label={`Select ${row.name || "homestay"}`} checked={selected.includes(row._id)} onChange={() => toggleOne(row._id)} /></td>
                  <td><strong>{row.name || "Untitled homestay"}</strong><small>{row.town?.name || "Town unavailable"} · {row.photoCount ?? 0} photos</small></td>
                  <td>{row.ownerName || row.host?.name || "—"}<small>{row.phone}</small></td>
                  <td><span>{row.docsCount} / 3</span>{row.docsCount < 3 && <Pill tone="warn">Incomplete</Pill>}</td>
                  <td><AdminStatus status={row.status} /></td>
                  <td>{row.daysWaiting == null ? "—" : <>{row.daysWaiting} days{row.status === "pending" && row.daysWaiting >= 3 && <Pill tone="bad">Over target</Pill>}</>}</td>
                  <td><ButtonLink size="sm" to={`/admin/approvals/${row._id}`}>Open</ButtonLink></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {reminders.isError && <p className="trip-inline-error" role="alert">{getErrorMessage(reminders.error)}</p>}
        <AdminPagination pagination={queueQuery.data?.pagination} page={page} setPage={setPage} />
      </section>
    </>
  );
}
