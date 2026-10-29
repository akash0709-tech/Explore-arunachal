import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Circle, MapContainer, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { getStay, recordContactTap, reportStay } from "../api/stays.js";
import { getTrip, listTrips, updateTrip } from "../api/trips.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { PhotoLightbox } from "../features/stays/PhotoLightbox.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { useToast } from "../hooks/useToast.js";
import { thumbnailUrl } from "../utils/images.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const REPORT_REASONS = [
  { value: "wrong_price", label: "The price is wrong" },
  { value: "wrong_location_or_photos", label: "The location or photos are misleading" },
  { value: "host_unreachable", label: "The host cannot be reached" },
  { value: "safety", label: "I have a safety concern" }
];

function FitApproximateLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 13);
  }, [map, position]);
  return null;
}

function ApproximateMap({ location }) {
  const lat = location?.lat;
  const lng = location?.lng;
  const position = useMemo(
    () => lat == null || lng == null ? null : [lat, lng],
    [lat, lng]
  );
  if (!position) {
    return <p className="text-muted">Approximate map location is not available for this listing.</p>;
  }
  return (
    <div className="stay-detail-map">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false}>
        <FitApproximateLocation position={position} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={position}
          radius={500}
          pathOptions={{ color: "#2f7a5a", fillColor: "#6fcca0", fillOpacity: 0.18, weight: 2 }}
        />
      </MapContainer>
      <p className="text-small text-muted">Approximate area only — within about 500 m. The exact address is not shown.</p>
    </div>
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy is not available in this browser.");
}

export default function StayDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState("");
  const [selectedTrip, setSelectedTrip] = useState("");
  const [copying, setCopying] = useState(false);

  const stayQuery = useQuery({
    queryKey: ["stays", id],
    queryFn: () => getStay(id)
  });
  const tripsQuery = useQuery({
    queryKey: ["trips", "list", "for-stay"],
    queryFn: () => listTrips({ page: 1, limit: 50 }),
    enabled: Boolean(user)
  });
  const saveMutation = useMutation({
    mutationFn: () => updateTrip(selectedTrip, { addHostId: id }),
    onSuccess: async () => {
      try {
        const updatedTrip = await getTrip(selectedTrip);
        queryClient.setQueryData(["trips", selectedTrip], updatedTrip);
      } catch (error) {
        toast({
          tone: "warn",
          title: "Homestay saved, but the offline trip copy could not be refreshed",
          message: getErrorMessage(error)
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Homestay saved to your trip" });
      setSelectedTrip("");
    },
    onError: (error) => toast({ tone: "bad", title: "Could not save homestay", message: getErrorMessage(error) })
  });
  const reportMutation = useMutation({
    mutationFn: (body) => reportStay(id, body),
    onSuccess: async () => {
      setReportError("");
      setReportOpen(false);
      setReportReason("");
      setReportNote("");
      toast({ title: "Report sent", message: "Our team will review this listing." });
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (error) => setReportError(getErrorMessage(error))
  });

  const stay = stayQuery.data;
  const photos = stay?.photos ?? [];
  const showLogin = () => {
    if (authLoading) return true;
    if (user) return false;
    navigate("/login", {
      state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } }
    });
    return true;
  };

  const onContact = (channel) => {
    if (!isOnline) return;
    recordContactTap(id, channel).catch((error) => {
      toast({ tone: "bad", title: "Contact tap could not be recorded", message: getErrorMessage(error) });
    });
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      await copyText(stay.phone);
      toast({ title: "Phone number copied" });
    } catch (error) {
      toast({ tone: "bad", title: "Could not copy phone number", message: error.message });
    } finally {
      setCopying(false);
    }
  };

  const openReport = () => {
    if (showLogin("report")) return;
    setReportOpen((open) => !open);
    setReportError("");
  };

  const submitReport = (event) => {
    event.preventDefault();
    if (!isOnline) return;
    if (!reportReason) {
      setReportError("Choose a reason for your report.");
      return;
    }
    setReportError("");
    reportMutation.mutate({ reason: reportReason, note: reportNote.trim() || undefined });
  };

  const handleSaveToTrip = () => {
    if (!isOnline) return;
    if (showLogin("save")) return;
    if (!selectedTrip) {
      toast({ tone: "warn", title: "Choose a trip first" });
      return;
    }
    saveMutation.mutate();
  };

  if (stayQuery.isLoading) {
    return <div className="container section stack"><Skeleton height={36} width="45%" /><Skeleton height={420} radius={16} /><Skeleton height={220} radius={16} /></div>;
  }
  if (stayQuery.isError) {
    return (
      <>
        <PageHeader eyebrow="Verified homestay" title="Homestay unavailable" />
        <div className="container section">
          <EmptyState icon="alert" title="Could not open this homestay">
            {getErrorMessage(stayQuery.error)}
            <ButtonLink to="/stays">Back to homestays</ButtonLink>
          </EmptyState>
        </div>
      </>
    );
  }

  const town = stay.town?.name ?? "Arunachal Pradesh";
  const whatsappNumber = (stay.whatsapp || stay.phone || "").replace(/\D/g, "");
  const hostName = stay.hostName || "Local host";

  return (
    <>
      <PageHeader
        eyebrow="Verified homestay"
        title={stay.name}
        subtitle={`${town}${stay.town?.altitudeM ? ` · ${Math.round(stay.town.altitudeM).toLocaleString("en-IN")} m` : ""} · Hosted by ${hostName}`}
        actions={<Pill tone="ok" icon="check">Approved by platform</Pill>}
      />

      <div className="container section stay-detail">
        <Link className="stay-back-link" to="/stays">← Back to homestays</Link>

        <section className="stay-gallery" aria-label="Homestay photos">
          {photos.length > 0 ? (
            <>
              <button type="button" className="stay-gallery__cover" onClick={() => setLightboxIndex(0)}>
                <img src={thumbnailUrl(photos[0].url, 1200, 82)} alt={photos[0].label || `${stay.name} exterior`} />
              </button>
              <div className="stay-gallery__side">
                {photos.slice(1, 3).map((photo, index) => (
                  <button type="button" key={photo.fileId ?? photo.url} onClick={() => setLightboxIndex(index + 1)}>
                    <img src={photo.thumbnailUrl || thumbnailUrl(photo.url, 700)} alt={photo.label || `${stay.name} photo ${index + 2}`} />
                  </button>
                ))}
                {photos.length > 3 && (
                  <button type="button" className="stay-gallery__more" onClick={() => setLightboxIndex(3)}>
                    +{photos.length - 3} more photos
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="stay-gallery__empty">No photos have been added to this listing.</div>
          )}
        </section>

        <div className="stay-detail-grid">
          <div className="stay-detail-main">
            <section className="stay-info-card">
              <div className="stay-section-heading">
                <div><p className="page-header__eyebrow">About this place</p><h2>{stay.name}</h2></div>
                <Pill tone="ok" icon="check">Verified</Pill>
              </div>
              <p>{stay.description || "The host has not added a description yet."}</p>
              <dl className="stay-facts">
                <div><dt>Town</dt><dd>{town}{stay.town?.district ? `, ${stay.town.district}` : ""}</dd></div>
                <div><dt>Rooms</dt><dd>{stay.rooms ?? "Not specified"}</dd></div>
                <div><dt>Guests</dt><dd>{stay.maxGuests ?? "Not specified"}</dd></div>
                <div><dt>Languages</dt><dd>Contact the host to confirm</dd></div>
                <div><dt>Price</dt><dd>₹{stay.pricePerNight?.toLocaleString("en-IN")} per night</dd></div>
                {stay.peakPrice > 0 && <div><dt>Peak season</dt><dd>₹{stay.peakPrice.toLocaleString("en-IN")} per night</dd></div>}
                {stay.checkIn && <div><dt>Check-in</dt><dd>{stay.checkIn}</dd></div>}
                {stay.checkOut && <div><dt>Check-out</dt><dd>{stay.checkOut}</dd></div>}
              </dl>
              <div className="stay-facilities">
                <h3>Facilities</h3>
                {(stay.facilities ?? []).length ? (
                  <div className="stay-card__facilities">
                    {stay.facilities.map((facility) => <span className="stay-facility-tag" key={facility}>{facility}</span>)}
                  </div>
                ) : <p className="text-muted">No facilities listed.</p>}
              </div>
              {stay.otherFacilities && <p className="text-small">{stay.otherFacilities}</p>}
            </section>

            <section className="stay-info-card">
              <p className="page-header__eyebrow">Approximate area</p>
              <h2>Location</h2>
              <ApproximateMap location={stay.location} />
            </section>

            <section className="stay-info-card stay-certification-note">
              <strong>About approval</strong>
              <p>Approval means the documents were checked by us. It is not government certification.</p>
            </section>
          </div>

          <aside className="stay-contact-column">
            <section className="stay-contact-card">
              <p className="page-header__eyebrow">Contact the host</p>
              <h2>₹{stay.pricePerNight?.toLocaleString("en-IN")} <span>/ night</span></h2>
              <p className="stay-contact-card__host">{hostName}</p>
              {stay.phone && (
                <>
                  <div className="stay-phone-row">
                    <a href={`tel:${stay.phone}`} className="stay-phone">{stay.phone}</a>
                    <Button variant="ghost" size="sm" loading={copying} onClick={handleCopy}>Copy</Button>
                  </div>
                  <a className="btn btn--block stay-contact-action" href={`tel:${stay.phone}`} onClick={() => onContact("call")}>
                    Call host
                  </a>
                  {whatsappNumber && (
                    <a
                      className="btn btn--success btn--block stay-contact-action"
                      href={`https://wa.me/91${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onContact("whatsapp")}
                    >
                      WhatsApp host
                    </a>
                  )}
                </>
              )}
              {!stay.phone && <p className="text-muted">The host has not shared a contact number.</p>}

              {user ? (
                tripsQuery.isLoading ? <Skeleton height={46} /> : tripsQuery.isError ? (
                  <p className="trip-inline-error" role="alert">{getErrorMessage(tripsQuery.error)}</p>
                ) : tripsQuery.data?.items?.length ? (
                  <div className="stay-save-trip">
                    <label className="field">
                      <span className="field__label">Save to trip pack</span>
                      <select className="select" value={selectedTrip} onChange={(event) => setSelectedTrip(event.target.value)}>
                        <option value="">Choose one of your trips</option>
                        {tripsQuery.data.items.map((trip) => (
                          <option key={trip._id} value={trip._id}>
                            {trip.title || trip.destinationIds?.map((place) => place.name).join(" & ") || "Saved trip"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      block
                      loading={saveMutation.isPending}
                      disabled={!isOnline}
                      title={!isOnline ? "Connect to the internet to save this homestay." : undefined}
                      onClick={handleSaveToTrip}
                    >
                      Save to trip pack
                    </Button>
                  </div>
                ) : <p className="text-small text-muted">Save a trip first, then add this homestay to its trip pack.</p>
              ) : (
                <Button
                  variant="ghost"
                  block
                  disabled={authLoading || !isOnline}
                  title={!isOnline ? "Connect to the internet to log in and save a trip." : undefined}
                  onClick={showLogin}
                >
                  Log in to save to a trip
                </Button>
              )}

              <p className="stay-certification-note__small">
                Approval means the documents were checked by us. It is not government certification.
              </p>
              <Button variant="ghost" block onClick={openReport}>
                {reportOpen ? "Cancel report" : "Report listing"}
              </Button>
              {reportOpen && (
                <form className="stay-report-form" onSubmit={submitReport}>
                  <fieldset className="field">
                    <legend className="field__label">Why are you reporting this listing?</legend>
                    {REPORT_REASONS.map((reason) => (
                      <label className="checkbox" key={reason.value}>
                        <input
                          type="radio"
                          name="report-reason"
                          value={reason.value}
                          checked={reportReason === reason.value}
                          onChange={() => setReportReason(reason.value)}
                        />
                        <span>{reason.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="field">
                    <span className="field__label">Additional details (optional)</span>
                    <textarea
                      className="textarea"
                      maxLength={1000}
                      value={reportNote}
                      onChange={(event) => setReportNote(event.target.value)}
                    />
                  </label>
                  {reportError && <p className="field__error" role="alert">{reportError}</p>}
                  <Button
                    type="submit"
                    block
                    loading={reportMutation.isPending}
                    disabled={!isOnline}
                    title={!isOnline ? "Connect to the internet to send a listing report." : undefined}
                  >
                    Send report
                  </Button>
                </form>
              )}
            </section>
          </aside>
        </div>
      </div>

      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos.map((photo) => ({ ...photo, url: thumbnailUrl(photo.url, 1600, 85) }))}
          index={lightboxIndex}
          onChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
