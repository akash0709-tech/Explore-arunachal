import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { deleteTrip, getTrip, updateTrip } from "../api/trips.js";
import { getTripGeometry } from "../api/maps.js";
import { checkPermits } from "../api/permits.js";
import { getStay } from "../api/stays.js";
import { getDestinationForecast } from "../api/weather.js";
import { Button } from "../components/ui/Button.jsx";
import { ConfirmInline } from "../components/ui/ConfirmInline.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { ProgressSteps } from "../components/ui/ProgressSteps.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { TripResults } from "../features/trips/TripResults.jsx";
import { useOfflineTripCache } from "../hooks/useOfflineTripCache.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { useToast } from "../hooks/useToast.js";
import { formatDate } from "../utils/format.js";
import { getErrorMessage } from "../utils/apiErrors.js";
import { hasCachedTripPack, removeCachedTrip } from "../utils/offlineCache.js";
import { downloadTripPdf } from "../utils/tripPdf.js";

const STEPS = ["Trip", "Permit", "Plan", "Stay", "Save"];

function warmImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error("A saved host photo could not be downloaded for offline use."));
    image.src = url;
  });
}

export default function TripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const { available: cachedTrip } = useOfflineTripCache(id);
  const [packReady, setPackReady] = useState(false);

  const tripQuery = useQuery({
    queryKey: ["trips", id],
    queryFn: async () => {
      const savedTrip = await getTrip(id);
      if (
        !savedTrip ||
        typeof savedTrip !== "object" ||
        Array.isArray(savedTrip) ||
        !Array.isArray(savedTrip.destinationIds) ||
        !Array.isArray(savedTrip.plan?.days) ||
        !Array.isArray(savedTrip.plan?.warnings) ||
        !savedTrip.cost
      ) {
        throw new Error("The server returned an incomplete trip itinerary.");
      }
      return savedTrip;
    },
    networkMode: "always"
  });
  const trip = tripQuery.data;
  const geometryQuery = useQuery({
    queryKey: ["maps", "trip-geometry", id],
    queryFn: () => getTripGeometry(id),
    enabled: Boolean(trip),
    networkMode: "always",
    retry: false
  });
  const farthestSlug = trip?.destinationIds?.at(-1)?.slug;
  const weatherQuery = useQuery({
    queryKey: ["weather", "trip", farthestSlug],
    queryFn: () => getDestinationForecast(farthestSlug, 7),
    enabled: Boolean(farthestSlug),
    retry: false,
    networkMode: "always"
  });
  const destinationSlugs = useMemo(
    () => (trip?.destinationIds ?? [])
      .map((place) => typeof place === "object" ? place.slug : "")
      .filter(Boolean),
    [trip?.destinationIds]
  );
  const permitKey = destinationSlugs.slice().sort().join(",");

  useEffect(() => {
    let active = true;
    let attempts = 0;
    if (!trip) return undefined;
    const check = () => hasCachedTripPack(id, {
      permitSlugs: destinationSlugs,
      weatherSlug: farthestSlug,
      hasSavedHosts: Boolean(trip.savedHostIds?.length)
    }).then((ready) => {
      if (active && ready) setPackReady(true);
      return ready;
    });
    check().catch((error) => console.error("Could not inspect offline trip pack.", error));
    const timer = window.setInterval(() => {
      attempts += 1;
      check()
        .then((ready) => {
          if (ready || attempts >= 20) window.clearInterval(timer);
        })
        .catch((error) => {
          window.clearInterval(timer);
          console.error("Could not inspect offline trip pack.", error);
        });
    }, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id, trip, destinationSlugs, permitKey, farthestSlug]);

  const updateMutation = useMutation({
    mutationFn: (changes) => updateTrip(id, changes),
    onSuccess: (updated) => {
      queryClient.setQueryData(["trips", id], updated);
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip updated" });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not update trip", message: getErrorMessage(error) })
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id),
    onSuccess: async () => {
      try {
        await removeCachedTrip(id);
      } catch (error) {
        toast({ tone: "bad", title: "Trip deleted, but its offline copy remains", message: error.message });
      }
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip deleted", tone: "mute" });
      navigate("/saved", { replace: true });
    },
    onError: (error) => toast({ tone: "bad", title: "Could not delete trip", message: getErrorMessage(error) })
  });
  const packMutation = useMutation({
    mutationFn: async () => {
      const currentTrip = await getTrip(id);
      const slugs = (currentTrip.destinationIds ?? [])
        .map((place) => typeof place === "object" ? place.slug : "")
        .filter(Boolean);
      const farthest = slugs.at(-1);
      const [permit, forecast, hostDetails] = await Promise.all([
        checkPermits({ citizen: currentTrip.citizen, destinations: slugs }),
        farthest ? getDestinationForecast(farthest, 7) : Promise.resolve(null),
        Promise.all((currentTrip.savedHostIds ?? []).map((host) => getStay(host._id)))
      ]);
      const photoUrls = hostDetails.flatMap((host) => (host.photos ?? []).map((photo) => photo.url).filter(Boolean));
      await Promise.all(photoUrls.map(warmImage));
      return { currentTrip, permit, forecast, slugs, farthest };
    },
    onSuccess: ({ currentTrip, permit, forecast, slugs, farthest }) => {
      queryClient.setQueryData(["trips", id], currentTrip);
      queryClient.setQueryData(
        ["permits", "trip-result", currentTrip.citizen, slugs.slice().sort().join(",")],
        permit
      );
      if (forecast && farthest) queryClient.setQueryData(["weather", "trip", farthest], forecast);
      setPackReady(true);
      toast({ title: "Trip pack is ready offline" });
    },
    onError: (error) => toast({
      tone: "bad",
      title: "Could not prepare the offline trip pack",
      message: getErrorMessage(error)
    })
  });

  if (tripQuery.isLoading) {
    return <div className="container section"><Skeleton height={180} /><Skeleton height={400} /></div>;
  }
  if (tripQuery.isError) {
    return (
      <>
        <PageHeader eyebrow="Your itinerary" title="Trip unavailable" subtitle="It may have been deleted, or it may belong to another account." />
        <div className="container section">
          <EmptyState icon="alert" title="Could not open this trip">
            {getErrorMessage(tripQuery.error)}
          </EmptyState>
        </div>
      </>
    );
  }

  const orderedDestinations = (trip.destinationIds ?? []).map((place) =>
    typeof place === "string" ? { id: place, slug: "" } : { id: place._id, slug: place.slug, name: place.name }
  );
  const checklist = trip.checklist ?? [];
  const toggleChecklistItem = (item) => {
    if (!isOnline || updateMutation.isPending) return;
    updateMutation.mutate({
      checklist: checklist.map((entry) => ({ id: entry._id, done: entry._id === item._id ? !item.done : entry.done }))
    });
  };
  const startName = typeof trip.startId === "object" ? trip.startId.name : "Start city";

  return (
    <>
      <PageHeader
        eyebrow="Your itinerary"
        title={trip.title || `${orderedDestinations.map((place) => place.name).filter(Boolean).join(" & ")} trip`}
        subtitle={`${startName} · ${trip.days} days · ${trip.travellers} traveller${trip.travellers === 1 ? "" : "s"} · Saved ${formatDate(trip.createdAt)}`}
      >
        <ProgressSteps steps={STEPS} current={5} label="Trip planning progress" />
      </PageHeader>

      <section className="container section trip-saved-layout">
        <div className="trip-saved-main">
          {checklist.length > 0 && (
            <motion.section
              className="trip-result-card trip-checklist-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="trip-result-card__heading">
                <div><p className="page-header__eyebrow">Get ready</p><h2>Trip checklist</h2></div>
                {updateMutation.isPending && <span className="text-small" role="status">Saving…</span>}
              </div>
              <ul className="checklist">
                {checklist.map((item) => (
                  <li key={item._id}>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={!isOnline || updateMutation.isPending}
                        title={!isOnline ? "Connect to the internet to update your checklist." : undefined}
                        onChange={() => toggleChecklistItem(item)}
                      />
                      <span>{item.item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          <TripResults
            citizen={trip.citizen}
            plan={{ ...trip.plan, cost: trip.cost }}
            orderedDestinations={orderedDestinations}
            weather={weatherQuery.data ?? null}
            weatherError={weatherQuery.isError ? getErrorMessage(weatherQuery.error) : ""}
            geometry={geometryQuery.data}
            geometryLoading={geometryQuery.isLoading}
            geometryError={geometryQuery.isError ? getErrorMessage(geometryQuery.error) : ""}
            travellers={trip.travellers}
            actions={
              <>
                <Button
                  variant="ghost"
                  disabled={!isOnline}
                  title={!isOnline ? "Connect to the internet to edit this trip." : undefined}
                  onClick={() => navigate(`/plan?edit=${encodeURIComponent(id)}`)}
                >
                  Edit trip
                </Button>
                <Button
                  variant="ghost"
                  disabled={!isOnline}
                  title={!isOnline ? "Connect to the internet to browse homestays." : undefined}
                  onClick={() => navigate(`/stays?town=${encodeURIComponent(farthestSlug ?? "")}`)}
                >
                  Find stays on this route
                </Button>
                <ConfirmInline
                  label="Delete trip"
                  message="Delete this saved trip?"
                  confirmLabel="Delete trip"
                  onConfirm={() => deleteMutation.mutate()}
                  loading={deleteMutation.isPending}
                  confirmVariant="danger"
                  disabled={!isOnline}
                  title={!isOnline ? "Connect to the internet to delete this trip." : undefined}
                />
              </>
            }
          />
        </div>

        <aside className="trip-saved-aside">
          <section className="trip-result-card trip-offline-card">
            <p className="page-header__eyebrow">Offline trip pack</p>
            <h2>{packReady ? "Available offline ✓" : "Make available offline"}</h2>
            <p className="text-muted">
              {isOnline
                ? "Trip, permit notes, weather and saved host photos are copied to this device’s cache. Download a PDF copy of your full itinerary anytime."
                : packReady || cachedTrip
                  ? "The trip response is cached on this device. Download the itinerary PDF or prepare the full pack while online."
                  : "Connect to the internet to prepare this trip for offline use."}
            </p>
            {packReady ? (
              <div className="stack" style={{ alignItems: "flex-start" }}>
                <Pill tone="ok">Available offline ✓</Pill>
                <Button
                  variant="ghost"
                  onClick={() => {
                    try {
                      downloadTripPdf(trip, weatherQuery.data);
                      toast({ title: "Trip PDF downloaded" });
                    } catch (error) {
                      toast({ tone: "bad", title: "Could not download trip PDF", message: error.message });
                    }
                  }}
                >
                  Download trip PDF
                </Button>
              </div>
            ) : (
              <div className="stack" style={{ alignItems: "flex-start" }}>
                <Button
                  variant="ghost"
                  loading={packMutation.isPending}
                  disabled={!isOnline || packMutation.isPending}
                  title={!isOnline ? "Connect to the internet to save this trip for offline use." : undefined}
                  onClick={() => packMutation.mutate()}
                >
                  Make available offline
                </Button>
                <Button
                  variant="ghost"
                  disabled={!trip}
                  onClick={() => {
                    try {
                      downloadTripPdf(trip, weatherQuery.data);
                      toast({ title: "Trip PDF downloaded" });
                    } catch (error) {
                      toast({ tone: "bad", title: "Could not download trip PDF", message: error.message });
                    }
                  }}
                >
                  Download trip PDF
                </Button>
              </div>
            )}
          </section>

          {trip.savedHostIds?.length > 0 && (
            <section className="trip-result-card trip-saved-hosts">
              <p className="page-header__eyebrow">Saved for this trip</p>
              <h2>Saved stays</h2>
              <ul>
                {trip.savedHostIds.map((stay) => (
                  <li key={stay._id}>
                    {isOnline
                      ? <Link to={`/stays/${stay._id}`}>{stay.name}</Link>
                      : <span title="Connect to the internet to open this homestay listing.">{stay.name}</span>}
                    <span className="text-small text-muted">{stay.hostId?.name || "Local host"}</span>
                    <span className="text-small text-muted">
                      {stay.town?.name}{stay.pricePerNight ? ` · ₹${stay.pricePerNight.toLocaleString("en-IN")}/night` : ""}
                    </span>
                    {stay.phone && <a className="text-small" href={`tel:${stay.phone}`}>{stay.phone}</a>}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!isOnline || updateMutation.isPending}
                      title={!isOnline ? "Connect to the internet to update saved hosts." : undefined}
                      onClick={() => updateMutation.mutate({ removeHostId: stay._id })}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-small text-muted">Estimated road distance: {Math.round(trip.plan.totalKm).toLocaleString("en-IN")} km</p>
        </aside>
      </section>
    </>
  );
}
