import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listReports, resolveReport } from "../api/admin.js";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { AdminPagination, AdminQueryError, AdminStatus, AdminLoadingRows } from "../features/admin/AdminShared.jsx";
import { formatDate } from "../utils/format.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const REASONS = {
  wrong_price: "Wrong price",
  wrong_location_or_photos: "Location or photos are wrong",
  host_unreachable: "Host unreachable",
  safety: "Safety concern"
};

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [reportAction, setReportAction] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["admin", "reports", "open", page],
    queryFn: () => listReports({ status: "open", page, limit: 20 })
  });
  const mutation = useMutation({
    mutationFn: ({ id, action, note: message }) => resolveReport(id, { action, ...(message ? { note: message } : {}) }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] })
      ]);
      setReportAction(null);
      setNote("");
      setError("");
      toast({ title: "Report marked resolved", message: result.listingSuspended ? "The listing was suspended." : undefined });
    },
    onError: (reason) => setError(getErrorMessage(reason))
  });
  const openAction = (report, action) => {
    setReportAction({ report, action });
    setNote("");
    setError("");
  };
  const confirm = () => {
    if (reportAction.action === "suspend_listing" && note.trim().length < 5) {
      setError("Explain why the listing must be suspended (at least 5 characters).");
      return;
    }
    mutation.mutate({ id: reportAction.report._id, action: reportAction.action, note: note.trim() });
  };

  return (
    <>
      <PageHeader eyebrow="Tourism review team" title="Traveller reports" subtitle="Review listing concerns and record how each report was resolved." />
      <section className="container section admin-content">
        {query.isError ? <AdminQueryError error={query.error} onRetry={() => query.refetch()} /> : query.isLoading ? <AdminLoadingRows /> : query.data.items.length === 0 ? (
          <div className="admin-card admin-empty"><h2>No open reports</h2><p>New traveller reports will appear here.</p></div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Homestay</th><th>Reason</th><th>From</th><th>Reported</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{query.data.items.map((report) => (
                <tr key={report._id}>
                  <td>{report.homestay ? <Link to={`/admin/approvals/${report.homestay._id}`}><strong>{report.homestay.name}</strong><small>{report.homestay.town?.name || "Town unavailable"}</small></Link> : <strong>Listing unavailable</strong>}</td>
                  <td><strong>{REASONS[report.reason] || report.reason}</strong>{report.note && <small>{report.note}</small>}</td>
                  <td>{report.reporter?.name || "Traveller"}<small>{report.reporter?.email || ""}</small></td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td><AdminStatus status={report.status} /></td>
                  <td><div className="admin-row-actions"><Button size="sm" variant="ghost" onClick={() => openAction(report, "dismiss")}>Mark resolved</Button>{report.homestay && ["live", "paused"].includes(report.homestay.status) && <Button size="sm" variant="danger" onClick={() => openAction(report, "suspend_listing")}>Suspend listing</Button>}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <AdminPagination pagination={query.data?.pagination} page={page} setPage={setPage} />
      </section>
      <Modal
        open={Boolean(reportAction)}
        onClose={() => !mutation.isPending && setReportAction(null)}
        title={reportAction?.action === "suspend_listing" ? "Suspend listing and resolve report" : "Mark report resolved"}
        footer={<><Button variant="ghost" disabled={mutation.isPending} onClick={() => setReportAction(null)}>Cancel</Button><Button variant={reportAction?.action === "suspend_listing" ? "danger" : "primary"} loading={mutation.isPending} onClick={confirm}>{reportAction?.action === "suspend_listing" ? "Suspend & resolve" : "Resolve report"}</Button></>}
      >
        {reportAction && <div className="stack"><p><strong>{reportAction.report.homestay?.name || "Homestay"}</strong> · {REASONS[reportAction.report.reason] || reportAction.report.reason}</p><label className="field"><span className="field__label">{reportAction.action === "suspend_listing" ? "Reason for suspension (required)" : "Resolution note (optional)"}</span><textarea className="input admin-note" rows={4} maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); setError(""); }} /></label>{error && <p className="field__error" role="alert">{error}</p>}</div>}
      </Modal>
    </>
  );
}
