import { Button } from "../../components/ui/Button.jsx";
import { Pill } from "../../components/ui/Pill.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { getErrorMessage } from "../../utils/apiErrors.js";

const STATUS = {
  draft: ["Draft", "mute"],
  pending: ["Pending review", "warn"],
  changes_requested: ["Changes requested", "bad"],
  live: ["Live", "ok"],
  paused: ["Paused", "mute"],
  rejected: ["Rejected", "bad"],
  suspended: ["Suspended", "bad"],
  open: ["Open", "warn"],
  resolved: ["Resolved", "ok"]
};

export function AdminStatus({ status }) {
  const [label, tone] = STATUS[status] ?? [status, "mute"];
  return <Pill tone={tone}>{label}</Pill>;
}

export function AdminPagination({ pagination, page, setPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span>
      <div className="row">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button size="sm" variant="ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function AdminLoadingRows({ count = 4 }) {
  return <div className="admin-loading-rows">{Array.from({ length: count }, (_, i) => <Skeleton key={i} height={56} />)}</div>;
}

export function AdminQueryError({ error, onRetry }) {
  return (
    <div className="admin-error" role="alert">
      <p>{getErrorMessage(error)}</p>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
