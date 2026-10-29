import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listHosts, reinstateListing, requestReverification, suspendListing } from "../api/admin.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import { AdminPagination, AdminQueryError, AdminStatus, AdminLoadingRows } from "../features/admin/AdminShared.jsx";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const TABS = [
  { id: "live", label: "Live" },
  { id: "paused", label: "Paused" },
  { id: "suspended", label: "Suspended" }
];
const ACTIONS = {
  suspend: { title: "Suspend listing", label: "Suspend", needsNote: true },
  reverify: { title: "Request re-verification", label: "Request re-verification", needsNote: true },
  reinstate: { title: "Reinstate listing", label: "Reinstate", needsNote: false }
};

export default function AdminHostsPage() {
  const [status, setStatus] = useState("live");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["admin", "hosts", status, page],
    queryFn: () => listHosts({ status, page, limit: 20 })
  });
  const actionMutation = useMutation({
    mutationFn: ({ type, id, note: message }) => {
      if (type === "suspend") return suspendListing(id, message);
      if (type === "reverify") return requestReverification(id, message);
      return reinstateListing(id, message || undefined);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "queue"] })
      ]);
      setAction(null);
      setNote("");
      setError("");
      toast({ title: "Host listing updated" });
    },
    onError: (reason) => setError(getErrorMessage(reason))
  });
  const startAction = (type, listing) => {
    setAction({ type, listing });
    setNote("");
    setError("");
  };
  const confirmAction = () => {
    const config = ACTIONS[action.type];
    if (config.needsNote && note.trim().length < 5) {
      setError("Enter a reason of at least 5 characters.");
      return;
    }
    actionMutation.mutate({ type: action.type, id: action.listing._id, note: note.trim() });
  };

  return (
    <>
      <PageHeader eyebrow="Tourism review team" title="Hosts" subtitle="Manage live, paused and suspended homestay listings." />
      <section className="container section admin-content">
        <Tabs label="Host listing status" tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        {query.isError ? <AdminQueryError error={query.error} onRetry={() => query.refetch()} /> : query.isLoading ? <AdminLoadingRows /> : query.data.items.length === 0 ? (
          <div className="admin-card admin-empty"><h2>No {status} listings</h2><p>Listings in this status will appear here.</p></div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Property</th><th>Host</th><th>Contact</th><th>Status</th><th>Views / taps</th><th>Actions</th></tr></thead>
              <tbody>{query.data.items.map((listing) => (
                <tr key={listing._id}>
                  <td><strong>{listing.name}</strong><small>{listing.town?.name || "Town unavailable"} · ₹{(listing.pricePerNight ?? 0).toLocaleString("en-IN")} / night</small></td>
                  <td>{listing.host?.name || "—"}<small>{listing.host?.email || "—"}</small></td>
                  <td>{listing.host?.phone || "—"}{listing.host?.phoneVerified && <small>Phone verified</small>}</td>
                  <td><AdminStatus status={listing.status} /></td>
                  <td>{(listing.stats?.views ?? 0).toLocaleString("en-IN")} / {(listing.stats?.contactTaps ?? 0).toLocaleString("en-IN")}</td>
                  <td><div className="admin-row-actions">
                    {listing.status !== "suspended" && <Button size="sm" variant="danger" onClick={() => startAction("suspend", listing)}>Suspend</Button>}
                    <Button size="sm" variant="ghost" onClick={() => startAction("reverify", listing)}>Re-verify</Button>
                    {listing.status === "suspended" && <Button size="sm" variant="success" onClick={() => startAction("reinstate", listing)}>Reinstate</Button>}
                    <ButtonLink size="sm" variant="ghost" to={`/admin/approvals/${listing._id}`}>Details</ButtonLink>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <AdminPagination pagination={query.data?.pagination} page={page} setPage={setPage} />
      </section>
      <Modal
        open={Boolean(action)}
        onClose={() => !actionMutation.isPending && setAction(null)}
        title={action ? ACTIONS[action.type].title : ""}
        footer={<><Button variant="ghost" disabled={actionMutation.isPending} onClick={() => setAction(null)}>Cancel</Button><Button variant={action?.type === "suspend" ? "danger" : "primary"} loading={actionMutation.isPending} onClick={confirmAction}>{action ? ACTIONS[action.type].label : ""}</Button></>}
      >
        {action && <div className="stack"><p>Listing: <strong>{action.listing.name}</strong></p><label className="field"><span className="field__label">{ACTIONS[action.type].needsNote ? "Reason for the host" : "Note (optional)"}</span><textarea className="input admin-note" rows={4} maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); setError(""); }} /></label>{error && <p className="field__error" role="alert">{error}</p>}</div>}
      </Modal>
    </>
  );
}
