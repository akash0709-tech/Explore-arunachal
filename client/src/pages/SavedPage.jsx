import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { deleteTrip, getTrip, listTrips } from "../api/trips.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { ConfirmInline } from "../components/ui/ConfirmInline.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import { useOfflineTripCache } from "../hooks/useOfflineTripCache.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { useToast } from "../hooks/useToast.js";
import { formatDate, formatHours, formatKm, formatRupees } from "../utils/format.js";
import { getErrorMessage } from "../utils/apiErrors.js";
import { removeCachedTrip } from "../utils/offlineCache.js";

const PAGE_SIZE = 50;
const TRIP_TABS = [
  { id: "itinerary", label: "Itinerary" },
  { id: "permits", label: "Permit notes" },
  { id: "hosts", label: "Host contacts" }
];

function getTripTitle(trip) {
  const start = typeof trip.startId === "object" ? trip.startId.name : "Start city";
  const destinations = trip.destinationIds ?? [];
  const farthest = destinations.at(-1);
  const destination = typeof farthest === "object" ? farthest.name : "Destination";
  return `${start} → ${destination} · ${trip.days} days`;
}

function TripTabContent({ tab, trip, isLoading, error, online }) {
  if (isLoading) return <p className="text-muted" role="status">Loading trip details…</p>;
  if (error) {
    return (
      <p className="trip-inline-error" role="alert">
        {online ? getErrorMessage(error) : "This trip detail is not in the offline cache yet. Open it while online or make it available offline first."}
      </p>
    );
  }
  if (!trip) return null;

  if (tab === "permits") {
    const permit = trip.permitSnapshot;
    return (
      <div className="saved-trip-notes">
        <h3>{permit?.title || "Permit notes"}</h3>
        {permit ? (
          <>
            <Pill tone="warn">{permit.code}</Pill>
            {permit.lastVerifiedAt && <p className="text-small text-muted">Last verified {formatDate(permit.lastVerifiedAt)}</p>}
            {permit.documents?.length > 0 && (
              <><h4>Documents to carry</h4><ul>{permit.documents.map((item) => <li key={item}>{item}</li>)}</ul></>
            )}
            {permit.steps?.length > 0 && (
              <><h4>Application steps</h4><ol>{permit.steps.map((item) => <li key={item}>{item}</li>)}</ol></>
            )}
            {permit.officialUrl && <a href={permit.officialUrl} target="_blank" rel="noreferrer">Open official permit portal</a>}
          </>
        ) : <p className="text-muted">No permit checklist was saved for this itinerary.</p>}
        {trip.plan?.warnings?.length > 0 && (
          <div className="saved-trip-warnings">
            <h4>Route notes</h4>
            {trip.plan.warnings.map((warning, index) => <p key={`${index}-${warning.text}`}>{warning.text}</p>)}
          </div>
        )}
      </div>
    );
  }

  if (tab === "hosts") {
    const hosts = trip.savedHostIds ?? [];
    return hosts.length ? (
      <ul className="saved-trip-hosts">
        {hosts.map((host) => (
          <li key={host._id}>
            <div>
              <strong>{host.hostId?.name || "Local host"}</strong>
              <span>{host.name} · {host.town?.name || "Town unavailable"}</span>
              {host.phone && <a href={`tel:${host.phone}`}>{host.phone}</a>}
            </div>
            {online
              ? <Link to={`/stays/${host._id}`}>Listing</Link>
              : <span title="Connect to the internet to open this homestay listing.">Listing</span>}
          </li>
        ))}
      </ul>
    ) : <p className="text-muted">No host contacts have been saved to this trip yet.</p>;
  }

  return (
    <div className="saved-trip-itinerary">
      {trip.plan?.warnings?.length > 0 && (
        <div className="saved-trip-warnings">
          {trip.plan.warnings.map((warning, index) => <p key={`${index}-${warning.text}`}>{warning.text}</p>)}
        </div>
      )}
      {trip.plan?.days?.length ? (
        <ol>
          {trip.plan.days.map((day) => (
            <li key={day.dayNumber}>
              <strong>Day {day.dayNumber}: {day.fromName} → {day.toName}</strong>
              <span>{day.via?.length ? `via ${day.via.join(" · ")} · ` : ""}{formatKm(day.km)} · {day.hours ? formatHours(day.hours) : "Local day"}</span>
              {day.stayName && <small>Night in {day.stayName}{day.stayAltitudeM ? ` · ${Math.round(day.stayAltitudeM).toLocaleString("en-IN")} m` : ""}</small>}
            </li>
          ))}
        </ol>
      ) : <p className="text-muted">The itinerary details are not available in this trip.</p>}
    </div>
  );
}

function TripCard({ trip, selectedTab, onSelectTab, detailQuery, online, onDelete, deletePending }) {
  const detail = detailQuery.data;
  const start = typeof trip.startId === "object" ? trip.startId.name : "Start city";

  return (
    <article className="saved-trip-card">
      <div className="saved-trip-card__header">
        <div>
          <p className="page-header__eyebrow">{trip.title || "Saved itinerary"}</p>
          <h2>{getTripTitle(trip)}</h2>
        </div>
        <Pill tone="mute">{formatDate(trip.createdAt)}</Pill>
      </div>
      <dl className="saved-trip-facts">
        <div><dt>Route starts</dt><dd>{start}</dd></div>
        <div><dt>Travellers</dt><dd>{trip.travellers}</dd></div>
        <div><dt>Per person</dt><dd>{formatRupees(trip.cost?.total ?? 0)}</dd></div>
      </dl>
      <Tabs
        label={`${getTripTitle(trip)} details`}
        tabs={TRIP_TABS}
        value={selectedTab}
        onChange={onSelectTab}
      />
      <div className="saved-trip-card__content" role="tabpanel">
        <TripTabContent
          tab={selectedTab}
          trip={detail}
          isLoading={detailQuery.isLoading}
          error={detailQuery.error}
          online={online}
        />
      </div>
      <div className="saved-trip-card__actions">
        <ButtonLink to={`/trips/${trip._id}`}>Open trip</ButtonLink>
        <ConfirmInline
          label="Delete"
          message="Delete this saved trip?"
          confirmLabel="Delete trip"
          onConfirm={() => onDelete(trip._id)}
          loading={deletePending}
          disabled={!online}
          title={!online ? "Connect to the internet to delete a saved trip." : undefined}
        />
      </div>
    </article>
  );
}

export default function SavedPage() {
  const isOnline = useOnlineStatus();
  const { available: offlineReady } = useOfflineTripCache();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTrip, setSelectedTrip] = useState("");
  const [selectedTab, setSelectedTab] = useState("itinerary");

  const tripsQuery = useInfiniteQuery({
    queryKey: ["trips", "list", "saved-page"],
    queryFn: ({ pageParam = 1 }) => listTrips({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    networkMode: "always"
  });
  const trips = tripsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const currentTripId = selectedTrip || trips[0]?._id || "";
  const detailQuery = useQuery({
    queryKey: ["trips", currentTripId],
    queryFn: () => getTrip(currentTripId),
    enabled: Boolean(currentTripId),
    networkMode: "always"
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: async (_result, deletedId) => {
      try {
        await removeCachedTrip(deletedId);
      } catch (error) {
        toast({ tone: "bad", title: "Trip deleted, but its offline copy remains", message: error.message });
      }
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      setSelectedTrip((current) => current === deletedId ? "" : current);
      toast({ title: "Trip deleted", tone: "mute" });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not delete trip", message: getErrorMessage(error) })
  });

  const chooseTab = (tripId, tab) => {
    setSelectedTrip(tripId);
    setSelectedTab(tab);
  };

  return (
    <>
      <PageHeader
        eyebrow="Offline Trip Pack"
        title="Saved trips"
        subtitle="Your itineraries, permit notes and saved host contacts."
        actions={offlineReady ? <Pill tone="ok">● Offline ready</Pill> : null}
      />
      <section className="container section saved-trips-page">
        {tripsQuery.isError ? (
          <EmptyState icon="alert" title="Could not load saved trips">
            {getErrorMessage(tripsQuery.error)}
            {isOnline && <Button onClick={() => tripsQuery.refetch()}>Try again</Button>}
          </EmptyState>
        ) : tripsQuery.isLoading ? (
          <div className="saved-trip-list" aria-label="Loading saved trips">
            <Skeleton height={230} radius={16} />
            <Skeleton height={230} radius={16} />
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon="compass"
            title="No saved trips yet"
            action={<ButtonLink to="/plan">Plan a trip</ButtonLink>}
          >
            Plan an itinerary and save it here for the road.
          </EmptyState>
        ) : (
          <>
            <div className="saved-trip-list">
              {trips.map((trip) => (
                <TripCard
                  key={trip._id}
                  trip={trip}
                  selectedTab={selectedTrip === trip._id || !selectedTrip ? selectedTab : "itinerary"}
                  onSelectTab={(tab) => chooseTab(trip._id, tab)}
                  detailQuery={currentTripId === trip._id ? detailQuery : { data: null, isLoading: false, error: null }}
                  online={isOnline}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  deletePending={deleteMutation.isPending && deleteMutation.variables === trip._id}
                />
              ))}
            </div>
            {tripsQuery.hasNextPage && (
              <div className="saved-trip-load-more">
                <Button
                  variant="ghost"
                  loading={tripsQuery.isFetchingNextPage}
                  disabled={!isOnline}
                  title={!isOnline ? "Connect to the internet to load more trips." : undefined}
                  onClick={() => tripsQuery.fetchNextPage()}
                >
                  Load more trips
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
