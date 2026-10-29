import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createDraft, getHostDashboard, listMyHomestays, pauseListing, resumeListing } from "../api/host.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { ProgressSteps } from "../components/ui/ProgressSteps.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const PATH_STEPS = ["Account", "Register property", "Upload documents", "Admin review", "Go live"];
const STATUS = {
  draft: { label: "Draft", tone: "mute" },
  pending: { label: "Pending review", tone: "warn" },
  changes_requested: { label: "Changes requested", tone: "bad" },
  live: { label: "Live", tone: "ok" },
  paused: { label: "Paused", tone: "mute" },
  rejected: { label: "Rejected", tone: "bad" },
  suspended: { label: "Suspended", tone: "bad" }
};

function CountUp({ value }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 24, stiffness: 150 });
  const display = useTransform(spring, (number) => Math.round(number).toLocaleString("en-IN"));
  useEffect(() => motionValue.set(value ?? 0), [motionValue, value]);
  return <motion.strong>{display}</motion.strong>;
}

function ListingAction({ listing, onToggle, pending }) {
  if (listing.status === "draft" || listing.status === "changes_requested") {
    return <ButtonLink size="sm" to={`/host/register/${listing._id}`}>
      {listing.status === "draft" ? "Continue draft" : "Fix & resubmit"}
    </ButtonLink>;
  }
  if (listing.status === "live" || listing.status === "paused") {
    return (
      <div className="row host-listing-actions">
        <Button size="sm" variant="ghost" loading={pending} onClick={() => onToggle(listing)}>
          {listing.status === "live" ? "Pause" : "Resume"}
        </Button>
        <ButtonLink size="sm" variant="ghost" to={`/stays/${listing._id}`}>View</ButtonLink>
      </div>
    );
  }
  return <span className="text-small text-muted">Under review</span>;
}

export default function HostDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const dashboardQuery = useQuery({
    queryKey: ["host", "dashboard"],
    queryFn: getHostDashboard
  });
  const listingsQuery = useQuery({
    queryKey: ["host", "homestays"],
    queryFn: () => listMyHomestays({ page: 1, limit: 50 })
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["host", "dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["host", "homestays"] })
  ]);
  const createMutation = useMutation({
    mutationFn: createDraft,
    onSuccess: (draft) => navigate(`/host/register/${draft.id}`)
  });
  const statusMutation = useMutation({
    mutationFn: (listing) => listing.status === "live" ? pauseListing(listing._id) : resumeListing(listing._id),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Listing status updated" });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not update listing", message: getErrorMessage(error) })
  });
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Host";
  const listings = listingsQuery.data?.items ?? [];
  const createListing = () => createMutation.mutate();

  return (
    <>
      <PageHeader
        eyebrow="Host dashboard"
        title={`Welcome, ${firstName}`}
        subtitle="Manage your homestays and follow each listing through review."
        actions={<Button loading={createMutation.isPending} onClick={createListing}>Register a homestay</Button>}
      />
      <section className="container section host-dashboard">
        <section className="host-path-card" aria-labelledby="host-path-title">
          <div className="host-section-heading">
            <div>
              <p className="page-header__eyebrow">Your next steps</p>
              <h2 id="host-path-title">Your path to going live</h2>
            </div>
            {dashboardQuery.data && <span className="text-small text-muted">Step {dashboardQuery.data.pathStage} of 5</span>}
          </div>
          {dashboardQuery.isError ? (
            <p className="trip-inline-error" role="alert">{getErrorMessage(dashboardQuery.error)}</p>
          ) : dashboardQuery.isLoading ? (
            <Skeleton height={92} radius={14} />
          ) : (
            <ProgressSteps steps={PATH_STEPS} current={dashboardQuery.data.pathStage} label="Your path to going live" />
          )}
        </section>

        <div className="host-stats-grid" aria-label="Listing statistics">
          {[
            ["Listings", dashboardQuery.data?.listingsCount],
            ["Live", dashboardQuery.data?.liveCount],
            ["Views (30 days)", dashboardQuery.data?.views30d],
            ["Contact taps", dashboardQuery.data?.contactTaps30d]
          ].map(([label, value]) => (
            <article className="host-stat-card" key={label}>
              <span>{label}</span>
              {dashboardQuery.isLoading ? <Skeleton height={34} width="45%" /> : <CountUp value={value} />}
            </article>
          ))}
        </div>

        <section className="host-listings-section">
          <div className="host-section-heading">
            <div>
              <p className="page-header__eyebrow">Your properties</p>
              <h2>My listings</h2>
            </div>
            {listings.length > 0 && (
              <Button variant="ghost" onClick={createListing} loading={createMutation.isPending}>+ Add another property</Button>
            )}
          </div>
          {listingsQuery.isError ? (
            <div className="host-error-card" role="alert">
              <p>{getErrorMessage(listingsQuery.error)}</p>
              <Button variant="ghost" onClick={() => listingsQuery.refetch()}>Try again</Button>
            </div>
          ) : listingsQuery.isLoading ? (
            <div className="host-listing-skeletons"><Skeleton height={72} /><Skeleton height={72} /></div>
          ) : listings.length === 0 ? (
            <div className="host-empty-card">
              <div><h3>Your first homestay starts here</h3><p>Register a property to upload photos, add details and send it for review.</p></div>
              <Button loading={createMutation.isPending} onClick={createListing}>Register a homestay</Button>
            </div>
          ) : (
            <div className="host-table-wrap">
              <table className="host-listings-table">
                <thead><tr><th>Property</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {listings.map((listing) => {
                    const status = STATUS[listing.status] ?? STATUS.draft;
                    return (
                      <tr key={listing._id}>
                        <td>
                          <div className="host-property-cell">
                            {listing.thumbnailUrl
                              ? <img src={listing.thumbnailUrl} alt="" loading="lazy" />
                              : <span className="host-property-placeholder" aria-hidden="true">⌂</span>}
                            <div>
                              <strong>{listing.name || "Untitled homestay"}</strong>
                              <span>{listing.town?.name || "Town not selected"}{listing.pricePerNight ? ` · ₹${listing.pricePerNight.toLocaleString("en-IN")}/night` : ""}</span>
                            </div>
                          </div>
                          {listing.status === "changes_requested" && listing.reviewNote && (
                            <aside className="host-review-note"><strong>Review team</strong><p>{listing.reviewNote}</p></aside>
                          )}
                        </td>
                        <td><Pill tone={status.tone}>{status.label}</Pill></td>
                        <td>
                          <ListingAction
                            listing={listing}
                            onToggle={(item) => statusMutation.mutate(item)}
                            pending={statusMutation.isPending && statusMutation.variables?._id === listing._id}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {createMutation.isError && <p className="trip-inline-error" role="alert">{getErrorMessage(createMutation.error)}</p>}
        </section>
        <p className="text-small text-muted"><Link to="/host/register">Start a homestay registration</Link></p>
      </section>
    </>
  );
}
