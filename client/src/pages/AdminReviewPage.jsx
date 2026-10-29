import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Circle, MapContainer, TileLayer } from "react-leaflet";
import { decide, getReview } from "../api/admin.js";
import { getDocumentViewUrl } from "../api/uploads.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { AdminQueryError, AdminStatus } from "../features/admin/AdminShared.jsx";
import { formatDate, formatRupees } from "../utils/format.js";
import { getErrorMessage, getFieldErrors } from "../utils/apiErrors.js";
import "leaflet/dist/leaflet.css";

const CHECKS = [
  ["certificate", "Registration / approval"],
  ["proof", "Ownership / authority proof"],
  ["id", "Owner ID"],
  ["namesMatch", "Name matches across documents"],
  ["photosMatch", "Photos match property"]
];
const ACTION_LABELS = {
  HOMESTAY_SUBMITTED: "Submitted for review",
  HOMESTAY_APPROVED: "Approved and published",
  HOMESTAY_CHANGES_REQUESTED: "Changes requested",
  HOMESTAY_REJECTED: "Rejected",
  HOMESTAY_SUSPENDED: "Listing suspended",
  HOMESTAY_REINSTATED: "Listing reinstated",
  HOMESTAY_REVERIFICATION_REQUESTED: "Re-verification requested"
};
const CHECKLIST_NAMES = { certificate: "Approval", proof: "Ownership proof", id: "Owner ID", namesMatch: "Name match", photosMatch: "Photo match" };

function ToggleValidity({ value, onChange, allowNotApplicable = false }) {
  return (
    <div className="admin-validity" role="group" aria-label="Review status">
      <button type="button" aria-pressed={value === "valid"} data-active={value === "valid"} onClick={() => onChange("valid")}>Valid</button>
      <button type="button" aria-pressed={value === "invalid"} data-active={value === "invalid"} onClick={() => onChange("invalid")}>Invalid</button>
      {allowNotApplicable && <button type="button" aria-pressed={value === "not_applicable"} data-active={value === "not_applicable"} onClick={() => onChange("not_applicable")}>N/A</button>}
    </div>
  );
}

function DocumentMap({ location }) {
  const position = useMemo(() => location ? [location.lat, location.lng] : null, [location]);
  if (!position) return <p className="text-muted">Approximate location is not available.</p>;
  return (
    <div className="admin-review-map">
      <MapContainer center={position} zoom={12} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle center={position} radius={500} pathOptions={{ color: "#2f7a5a", fillColor: "#6fcca0", fillOpacity: 0.18 }} />
      </MapContainer>
      <small>Approximate area only. Exact address remains private.</small>
    </div>
  );
}

function DocumentViewer({ document, onClose }) {
  const [zoom, setZoom] = useState(1);
  const isPdf = /\.pdf(?:$|[?#])/i.test(document.url);
  return (
    <section className="admin-viewer" aria-label={`Document viewer: ${document.fileName}`}>
      <header><div><strong>{document.fileName}</strong><small>Signed link expires {new Date(document.expiresAt).toLocaleTimeString()}</small></div>
        <div className="row"><Button size="sm" variant="ghost" disabled={zoom <= 0.6} onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}>−</Button><span>{Math.round(zoom * 100)}%</span><Button size="sm" variant="ghost" disabled={zoom >= 2.5} onClick={() => setZoom((value) => Math.min(2.5, value + 0.2))}>+</Button><Button size="sm" variant="ghost" onClick={onClose}>Close</Button></div>
      </header>
      <div className="admin-viewer__canvas">
        {isPdf
          ? <iframe title={document.fileName} src={document.url} style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} />
          : <img src={document.url} alt={document.fileName} style={{ transform: `scale(${zoom})` }} />}
      </div>
    </section>
  );
}

export default function AdminReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reviewQuery = useQuery({ queryKey: ["admin", "review", id], queryFn: () => getReview(id) });
  const [checklist, setChecklist] = useState({});
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [viewer, setViewer] = useState(null);
  const [documentLoading, setDocumentLoading] = useState("");
  const review = reviewQuery.data;
  const homestay = review?.homestay;
  const requiredChecks = CHECKS.map(([key]) => key).filter((key) =>
    !(key === "certificate" && homestay?.approval?.type === "not_applicable")
  );
  const canApprove =
    requiredChecks.every((key) => checklist[key] === "valid") &&
    review?.documentSlots
      ?.filter((doc) => !(doc.slot === "certificate" && homestay?.approval?.type === "not_applicable"))
      .every((doc) => doc.uploaded);

  useEffect(() => {
    if (!review) return;
    const lastChecklist = review.history?.find((entry) => entry.meta?.checklist)?.meta?.checklist ?? {};
    setChecklist((current) => Object.keys(current).length ? current : {
      ...lastChecklist,
      ...(homestay?.approval?.type === "not_applicable" ? { certificate: "not_applicable" } : {})
    });
  }, [review, homestay?.approval?.type]);

  const decisionMutation = useMutation({
    mutationFn: (body) => decide(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "review", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      ]);
      navigate("/admin/approvals");
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      setInlineError(Object.values(fieldErrors).join(" ") || getErrorMessage(error));
      setDecision("");
    }
  });

  const openDocument = async (slot) => {
    setDocumentLoading(slot);
    setInlineError("");
    try {
      const document = await getDocumentViewUrl(id, slot);
      setViewer(document);
    } catch (error) {
      setInlineError(getErrorMessage(error));
    } finally {
      setDocumentLoading("");
    }
  };
  const chooseDecision = (value) => {
    if (value !== "approve" && note.trim().length < 5) {
      setInlineError("Write a note of at least 5 characters before requesting changes or rejecting.");
      return;
    }
    if (value === "approve" && !requiredChecks.every((key) => checklist[key] === "valid")) {
      setInlineError("Mark every required checklist item Valid before approving.");
      return;
    }
    setInlineError("");
    setDecision(value);
  };
  const confirmDecision = () => {
    const body = {
      decision,
      ...(note.trim() ? { note: note.trim() } : {}),
      checklist: Object.fromEntries(CHECKS.map(([key]) => [
        key,
        key === "certificate" && homestay.approval?.type === "not_applicable"
          ? "not_applicable"
          : checklist[key] ?? "invalid"
      ]))
    };
    decisionMutation.mutate(body);
  };

  return (
    <>
      <PageHeader eyebrow="Tourism review team" title={homestay?.name || "Review homestay"} subtitle="Inspect the property and its private documents, then record a decision." actions={<ButtonLink variant="ghost" to="/admin/approvals">Back to queue</ButtonLink>} />
      <section className="container section admin-content">
        {reviewQuery.isError ? <AdminQueryError error={reviewQuery.error} onRetry={() => reviewQuery.refetch()} /> : !review ? <div className="admin-card">Loading review details…</div> : (
          <>
            <header className="admin-review-heading"><div><h2>{homestay.name || "Untitled homestay"}</h2><p>{homestay.town?.name || "Town unavailable"} · {homestay.daysWaiting ?? 0} days waiting</p></div><AdminStatus status={homestay.status} /></header>
            <div className="admin-review-grid">
              <section className="admin-card">
                <h2>Business details</h2>
                <dl className="admin-details-list">
                  <div><dt>Owner</dt><dd>{homestay.ownerName || review.host?.name || "—"}</dd></div>
                  <div><dt>Phone</dt><dd><a href={`tel:${homestay.phone}`}>{homestay.phone || "—"}</a>{review.host?.phoneVerified && <Pill tone="ok">OTP verified ✓</Pill>}</dd></div>
                  <div><dt>Email</dt><dd>{review.host?.email || "—"}{review.host?.emailVerified && <Pill tone="ok">OTP verified ✓</Pill>}</dd></div>
                  <div><dt>Town</dt><dd>{homestay.town?.name || "—"}{homestay.town?.district ? ` · ${homestay.town.district}` : ""}</dd></div>
                  <div><dt>Rooms / guests</dt><dd>{homestay.rooms ?? "—"} rooms · up to {homestay.maxGuests ?? "—"} guests</dd></div>
                  <div><dt>Price / night</dt><dd>{homestay.pricePerNight ? formatRupees(homestay.pricePerNight) : "—"}</dd></div>
                  <div><dt>Facilities</dt><dd>{homestay.facilities?.join(", ") || "—"}</dd></div>
                  <div><dt>Address landmark</dt><dd>{homestay.addressLandmark || "—"} (private)</dd></div>
                </dl>
                {homestay.description && <p className="admin-business-description">{homestay.description}</p>}
              </section>
              <section className="admin-card">
                <h2>Approximate location</h2>
                <DocumentMap location={homestay.location} />
              </section>
            </div>

            <section className="admin-card">
              <header className="admin-card__heading"><div><p className="page-header__eyebrow">Property photos</p><h2>{homestay.photos.length} uploaded</h2></div></header>
              <div className="admin-review-photos">{homestay.photos.map((photo, index) => <a href={photo.url} target="_blank" rel="noreferrer" key={photo._id}><img src={photo.thumbnailUrl || photo.url} alt={`${photo.label || "Homestay"} photo ${index + 1}`} />{index === 0 && <Pill tone="ok">Cover</Pill>}</a>)}</div>
            </section>

            <section className="admin-card">
              <header className="admin-card__heading"><div><p className="page-header__eyebrow">Private verification</p><h2>Document checklist</h2></div><Pill tone="mute">Visible only to the review team</Pill></header>
              <div className="admin-table-wrap">
                <table className="admin-table admin-checklist-table">
                  <thead><tr><th>Checklist item</th><th>Uploaded document</th><th>View</th><th>Decision</th></tr></thead>
                  <tbody>
                    {CHECKS.slice(0, 3).map(([key, label]) => {
                      const doc = review.documentSlots.find((slot) => slot.slot === key);
                      const value = checklist[key] ?? (key === "certificate" && homestay.approval?.type === "not_applicable" ? "not_applicable" : "");
                      return (
                        <tr key={key}>
                          <td><strong>{label}</strong>{key === "certificate" && homestay.approval?.licenceNumber && <small>Licence {homestay.approval.licenceNumber}{homestay.approval.authority ? ` · ${homestay.approval.authority}` : ""}</small>}</td>
                          <td>{doc?.uploaded ? <><strong>{doc.fileName}</strong><small>{doc.proofType || doc.idType || ""}</small></> : <Pill tone="warn">Missing</Pill>}</td>
                          <td>{doc?.uploaded ? <Button size="sm" variant="ghost" loading={documentLoading === key} onClick={() => openDocument(key)}>View</Button> : "—"}</td>
                          <td>{key === "certificate" && homestay.approval?.type === "not_applicable"
                            ? <Pill tone="mute">Not applicable</Pill>
                            : <ToggleValidity value={value} onChange={(next) => setChecklist((current) => ({ ...current, [key]: next }))} />}</td>
                        </tr>
                      );
                    })}
                    {CHECKS.slice(3).map(([key, label]) => (
                      <tr key={key}><td colSpan="3"><strong>{label}</strong></td><td><ToggleValidity value={checklist[key] ?? ""} onChange={(next) => setChecklist((current) => ({ ...current, [key]: next }))} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {viewer && <DocumentViewer document={viewer} onClose={() => setViewer(null)} />}
            </section>

            <section className="admin-card admin-decision-card">
              <p className="page-header__eyebrow">Decision</p><h2>Review outcome</h2>
              <label className="field"><span className="field__label">Message for the host</span><textarea className="input admin-note" rows={4} maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); setInlineError(""); }} placeholder="Explain any changes required. A note is required for changes or rejection." /></label>
              {inlineError && <p className="field__error" role="alert">{inlineError}</p>}
              {decision && (
                <div className="admin-confirm-decision" role="group" aria-label="Confirm decision">
                  <strong>{decision === "approve" ? "Publish this homestay now?" : decision === "request_changes" ? "Send this listing back to the host?" : "Reject this listing?"}</strong>
                  <span>This action will be saved in the audit log and the host will be notified.</span>
                  <div className="row"><Button variant="ghost" onClick={() => setDecision("")}>Cancel</Button><Button variant={decision === "reject" ? "danger" : "primary"} loading={decisionMutation.isPending} onClick={confirmDecision}>Confirm decision</Button></div>
                </div>
              )}
              {homestay.status === "pending" && !decision && (
                <div className="row admin-decision-actions">
                  <Button variant="success" disabled={!canApprove} onClick={() => chooseDecision("approve")}>✓ Approve &amp; publish</Button>
                  <Button variant="ghost" onClick={() => chooseDecision("request_changes")}>↺ Request changes</Button>
                  <Button variant="danger" onClick={() => chooseDecision("reject")}>✕ Reject</Button>
                </div>
              )}
              {homestay.status !== "pending" && <p className="text-muted">Decisions are available only while a listing is pending review.</p>}
            </section>

            <section className="admin-card">
              <header className="admin-card__heading"><div><p className="page-header__eyebrow">History</p><h2>Audit log</h2></div></header>
              {review.history.length === 0 ? <p className="text-muted">No review actions have been recorded yet.</p> : (
                <ol className="admin-audit-list">{review.history.map((entry) => (
                  <li key={entry._id}>
                    <div><strong>{ACTION_LABELS[entry.action] || entry.action.replaceAll("_", " ")}</strong><span>{entry.actorId?.name || entry.actorId?.email || "System"} · {formatDate(entry.createdAt)}</span></div>
                    {entry.note && <p>{entry.note}</p>}
                    {entry.meta?.checklist && <small>{Object.entries(entry.meta.checklist).map(([key, value]) => `${CHECKLIST_NAMES[key] || key}: ${value}`).join(" · ")}</small>}
                  </li>
                ))}</ol>
              )}
              {review.reports?.length > 0 && <p className="admin-report-hint">There are {review.reports.length} associated traveller report(s).</p>}
            </section>
            <Link to="/admin/approvals" className="admin-back-link">← Back to approvals</Link>
          </>
        )}
      </section>
    </>
  );
}
