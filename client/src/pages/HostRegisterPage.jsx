import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { createDraft, getMyHomestay, saveStep, submitHomestay } from "../api/host.js";
import { deleteDocument, deletePhoto, reorderPhotos, uploadDocument, uploadPhotos } from "../api/uploads.js";
import { geocode } from "../api/maps.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip, ChipGroup } from "../components/ui/Chip.jsx";
import { FileDropzone } from "../components/ui/FileDropzone.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { Stepper } from "../components/ui/Stepper.jsx";
import { useDestinations } from "../features/destinations/useDestinationData.js";
import { useToast } from "../hooks/useToast.js";
import { getErrorMessage, getFieldErrors } from "../utils/apiErrors.js";
import { formatDate } from "../utils/format.js";
import "leaflet/dist/leaflet.css";

const STEPS = ["Basics", "Photos", "Rooms", "Approvals", "Proof", "Review"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROOM_TYPES = ["Private room", "Shared room", "Entire home", "Cottage", "Cabin"];
const FACILITIES = ["Wi-Fi", "Hot water", "Meals", "Heater", "Parking", "Attached bath", "Guide help"];
const PROOF_TYPES = ["Land record", "Lease", "Authorisation letter"];
const ID_TYPES = ["Aadhaar", "Voter ID", "Passport", "Driving licence", "Other government ID"];
const EMPTY_FORM = {
  name: "", ownerName: "", phone: "", whatsapp: "", sameAsPhone: true, description: "",
  town: "", addressLandmark: "", approxLocation: null,
  rooms: 1, maxGuests: 1, roomTypes: [], facilities: [], otherFacilities: "",
  pricePerNight: "", peakPrice: "", mealsIncluded: false, openMonths: MONTHS.map((_, index) => index + 1),
  checkIn: "12:00", checkOut: "10:00",
  approval: { type: "required", licenceNumber: "", authority: "", validUntil: "", naReason: "" },
  proofType: "", idType: "", truthful: false, notGovtCertified: false
};
const PHONE = /^\d{10}$/;
const stepSchemas = {
  1: z.object({
    name: z.string().trim().min(3, "Enter at least 3 characters").max(100),
    ownerName: z.string().trim().min(2, "Owner name is required").max(80),
    phone: z.string().regex(PHONE, "Enter a 10-digit mobile number"),
    whatsapp: z.string().optional(),
    sameAsPhone: z.boolean(),
    description: z.string().max(300, "Use 300 characters or fewer").optional(),
    town: z.string().min(1, "Choose a town"),
    addressLandmark: z.string().max(200).optional(),
    approxLocation: z.object({ lat: z.number(), lng: z.number() })
      .nullable()
      .refine(Boolean, { message: "Drop a pin on the map", path: ["approxLocation"] })
  }).superRefine((data, ctx) => {
    if (!data.sameAsPhone && data.whatsapp && !PHONE.test(data.whatsapp)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["whatsapp"], message: "Enter a 10-digit WhatsApp number" });
    }
    if (data.approxLocation && (
      data.approxLocation.lat < 26.5 || data.approxLocation.lat > 29.6 ||
      data.approxLocation.lng < 91.4 || data.approxLocation.lng > 97.5
    )) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["approxLocation"], message: "Choose a point inside Arunachal Pradesh." });
    }
  }),
  2: z.object({}),
  3: z.object({
    rooms: z.number().int().min(1).max(20),
    maxGuests: z.number().int().min(1).max(60),
    roomTypes: z.array(z.string()).max(10),
    facilities: z.array(z.string()).max(30),
    otherFacilities: z.string().max(200).optional(),
    pricePerNight: z.number().positive("Price per night must be more than 0").max(100000),
    peakPrice: z.number().positive().max(100000).optional(),
    mealsIncluded: z.boolean(),
    openMonths: z.array(z.number().int().min(1).max(12)).max(12),
    checkIn: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time"),
    checkOut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time")
  }),
  4: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("required"),
      licenceNumber: z.string().trim().min(1, "Licence number is required").max(60),
      authority: z.string().max(120).optional(),
      validUntil: z.string().optional()
    }),
    z.object({ type: z.literal("not_applicable"), naReason: z.string().trim().min(5, "Please explain why").max(300) })
  ]),
  5: z.object({
    proofType: z.string().min(1, "Choose the proof document type"),
    idType: z.string().min(1, "Choose the photo ID type")
  }),
  6: z.object({})
};

function formFromHomestay(homestay) {
  return {
    ...EMPTY_FORM,
    ...homestay,
    phone: homestay.phone ?? "",
    whatsapp: homestay.whatsapp ?? "",
    sameAsPhone: !homestay.phone || homestay.phone === homestay.whatsapp,
    town: typeof homestay.town === "object" ? homestay.town?._id : homestay.town ?? "",
    approxLocation: homestay.approxLocation?.lat != null
      ? { lat: homestay.approxLocation.lat, lng: homestay.approxLocation.lng }
      : null,
    rooms: homestay.rooms ?? 1,
    maxGuests: homestay.maxGuests ?? 1,
    roomTypes: homestay.roomTypes ?? [],
    facilities: homestay.facilities ?? [],
    pricePerNight: homestay.pricePerNight ?? "",
    peakPrice: homestay.peakPrice ?? "",
    openMonths: homestay.openMonths?.length ? homestay.openMonths : EMPTY_FORM.openMonths,
    approval: { ...EMPTY_FORM.approval, ...(homestay.approval ?? {}) },
    proofType: homestay.documents?.find((item) => item.slot === "proof")?.proofType ?? "",
    idType: homestay.documents?.find((item) => item.slot === "id")?.idType ?? "",
    truthful: homestay.declarations?.truthful ?? false,
    notGovtCertified: homestay.declarations?.notGovtCertified ?? false
  };
}

function fieldPayload(step, form) {
  if (step === 1) {
    const { sameAsPhone, ...data } = form;
    return { ...data, whatsapp: sameAsPhone ? form.phone : form.whatsapp || undefined };
  }
  if (step === 3) {
    return {
      ...form,
      pricePerNight: Number(form.pricePerNight),
      peakPrice: form.peakPrice === "" ? undefined : Number(form.peakPrice)
    };
  }
  if (step === 4) {
    const { validUntil, ...approval } = form.approval;
    return { ...approval, ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}) };
  }
  if (step === 5) return { proofType: form.proofType, idType: form.idType };
  return {};
}

function fieldErrorKey(field) {
  return field.replace(/^approval\./, "");
}

function InputField({ label, error, hint, children, required }) {
  return (
    <label className="field">
      <span className="field__label">{label}{required && <span className="field__required"> *</span>}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error" role="alert">{error}</span>}
    </label>
  );
}

function ChoiceChips({ label, values, selected, onToggle }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <ChipGroup label={label}>
        {values.map((value) => (
          <Chip key={value} selected={selected.includes(value)} onToggle={() => onToggle(value)}>{value}</Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

function PinMarker({ position }) {
  const icon = L.divIcon({
    className: "host-pin-marker",
    html: "<span></span>",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  return position ? <Marker position={[position.lat, position.lng]} icon={icon} /> : null;
}

function ClickToPin({ onPick }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function MapCenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 10));
  }, [map, position]);
  return null;
}

function PinPicker({ location, defaultPosition, onChange }) {
  const center = location ?? defaultPosition ?? { lat: 27.1, lng: 93.6 };
  return (
    <div className="host-pin-picker">
      <MapContainer center={[center.lat, center.lng]} zoom={location || defaultPosition ? 10 : 7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter position={location ?? defaultPosition} />
        <ClickToPin onPick={onChange} />
        <PinMarker position={location} />
      </MapContainer>
      <p className="text-small text-muted">Tap the map to drop an approximate pin. Exact address is hidden from the public.</p>
    </div>
  );
}

function PhoneField({ label, value, onChange, error, required }) {
  return (
    <InputField label={label} error={error} required={required}>
      <span className="host-phone-input"><span>+91</span><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))} /></span>
    </InputField>
  );
}

function UploadedDocument({ document, onRemove, disabled }) {
  if (!document) return null;
  return (
    <div className="host-document-item">
      <span><Icon name="file" /> <span><strong>{document.fileName}</strong><small>Uploaded {formatDate(document.uploadedAt)}</small></span></span>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={onRemove}>Remove</Button>
    </div>
  );
}

export default function HostRegisterPage() {
  const { homestayId: routeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const destinationsQuery = useDestinations();
  const destinations = useMemo(() => destinationsQuery.data ?? [], [destinationsQuery.data]);
  const homestayId = routeId ?? "";
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [homestay, setHomestay] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploading, setUploading] = useState({});
  const [geocodeText, setGeocodeText] = useState("");
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeError, setGeocodeError] = useState("");
  const createStarted = useRef(Boolean(routeId));

  const createMutation = useMutation({
    mutationFn: createDraft,
    onSuccess: (draft) => navigate(`/host/register/${draft.id}`, { replace: true }),
    onError: (error) => setServerError(getErrorMessage(error))
  });
  useEffect(() => {
    if (!routeId && !createStarted.current) {
      createStarted.current = true;
      createMutation.mutate();
    }
  }, [routeId, createMutation]);
  const homestayQuery = useQuery({
    queryKey: ["host", "homestays", homestayId],
    queryFn: () => getMyHomestay(homestayId),
    enabled: Boolean(homestayId)
  });
  useEffect(() => {
    if (!homestayQuery.data || homestay?._id === homestayQuery.data._id) return;
    const current = homestayQuery.data;
    setHomestay(current);
    setForm(formFromHomestay(current));
    setStep(Math.min(6, Math.max(1, current.currentStep ?? 1)));
  }, [homestay, homestayQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ stepNumber, data }) => saveStep(homestayId, stepNumber, data),
    onSuccess: (updated) => {
      setHomestay(updated);
      setForm(formFromHomestay(updated));
      setErrors({});
      setServerError("");
      queryClient.setQueryData(["host", "homestays", homestayId], updated);
      queryClient.invalidateQueries({ queryKey: ["host", "homestays"] });
      queryClient.invalidateQueries({ queryKey: ["host", "dashboard"] });
    }
  });
  const submitMutation = useMutation({
    mutationFn: (declarations) => submitHomestay(homestayId, declarations),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["host"] });
      toast({ title: "Submitted for verification" });
      setHomestay((current) => ({ ...current, status: "pending" }));
    }
  });

  const updateForm = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
    });
  };
  const updateApproval = (changes) => {
    setForm((current) => ({ ...current, approval: { ...current.approval, ...changes } }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
    });
  };
  const goToStep = (nextStep) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
    setErrors({});
    setServerError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const validateStep = (stepNumber) => {
    const result = stepSchemas[stepNumber].safeParse(fieldPayload(stepNumber, form));
    const nextErrors = result.success
      ? {}
      : Object.fromEntries(result.error.issues.map((issue) => [fieldErrorKey(issue.path.join(".")), issue.message]));
    if (stepNumber === 2 && (homestay?.photos?.length ?? 0) < 3) {
      nextErrors.photos = `Add at least 3 photos (you have ${homestay?.photos?.length ?? 0}).`;
    }
    if (stepNumber === 4 && form.approval.type === "required" && !homestay?.documents?.some((item) => item.slot === "certificate")) {
      nextErrors.certificate = "Upload the licence certificate.";
    }
    if (stepNumber === 5) {
      if (!homestay?.documents?.some((item) => item.slot === "proof")) nextErrors.proof = "Upload proof of property or address.";
      if (!homestay?.documents?.some((item) => item.slot === "id")) nextErrors.id = "Upload a photo ID.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const saveCurrent = async () => {
    if (!validateStep(step)) {
      setServerError("Complete the highlighted fields before saving this step.");
      return false;
    }
    setSavingDraft(true);
    setServerError("");
    try {
      await saveMutation.mutateAsync({ stepNumber: step, data: fieldPayload(step, form) });
      toast({ title: `Step ${step} saved` });
      return true;
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
      return false;
    } finally {
      setSavingDraft(false);
    }
  };
  const nextStep = async () => {
    if (await saveCurrent()) goToStep(Math.min(step + 1, 6));
  };
  const saveDraft = async () => { await saveCurrent(); };
  const saveDeclarations = async () => {
    if (!form.truthful || !form.notGovtCertified) return;
    setServerError("");
    submitMutation.mutate({ truthful: true, notGovtCertified: true }, {
      onError: (error) => {
        setErrors(getFieldErrors(error));
        setServerError(getErrorMessage(error));
      }
    });
  };

  const uploadPhotoFiles = async (files) => {
    setServerError("");
    for (const [index, file] of files.entries()) {
      const uploadId = `${Date.now()}-${index}`;
      setUploading((current) => ({ ...current, [uploadId]: { name: file.name, progress: 0 } }));
      try {
        const label = (homestay?.photos?.length ?? 0) === 0 ? "Cover" : (homestay?.photos?.length ?? 0) === 1 ? "Room" : "Exterior";
        const photos = await uploadPhotos(homestayId, [file], {
          labels: [label],
          onProgress: (progress) => setUploading((current) => ({
            ...current,
            [uploadId]: { name: file.name, progress }
          }))
        });
        setHomestay((current) => ({ ...current, photos }));
      } catch (error) {
        setServerError(getErrorMessage(error));
        toast({ tone: "bad", title: `Could not upload ${file.name}`, message: getErrorMessage(error) });
      } finally {
        setUploading((current) => {
          const next = { ...current };
          delete next[uploadId];
          return next;
        });
      }
    }
  };
  const removePhoto = async (fileId) => {
    try {
      const photos = await deletePhoto(homestayId, fileId);
      setHomestay((current) => ({ ...current, photos }));
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };
  const movePhoto = async (sourceId, targetId) => {
    const currentPhotos = [...(homestay?.photos ?? [])].sort((a, b) => a.order - b.order);
    const from = currentPhotos.findIndex((photo) => photo._id === sourceId);
    const to = currentPhotos.findIndex((photo) => photo._id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = currentPhotos.splice(from, 1);
    currentPhotos.splice(to, 0, moved);
    try {
      const photos = await reorderPhotos(homestayId, currentPhotos.map((photo) => photo.fileId));
      setHomestay((current) => ({ ...current, photos }));
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };
  const changePhotoOrder = (photoId, delta) => {
    const photos = [...(homestay?.photos ?? [])].sort((a, b) => a.order - b.order);
    const index = photos.findIndex((photo) => photo._id === photoId);
    const target = photos[index + delta];
    if (target) movePhoto(photoId, target._id);
  };
  const uploadPrivateDocument = async (file, slot) => {
    setUploading((current) => ({ ...current, [slot]: 0 }));
    setServerError("");
    try {
      const documents = await uploadDocument(homestayId, file, {
        slot,
        proofType: slot === "proof" ? form.proofType : undefined,
        idType: slot === "id" ? form.idType : undefined,
        onProgress: (progress) => setUploading((current) => ({ ...current, [slot]: progress }))
      });
      setHomestay((current) => ({ ...current, documents }));
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setUploading((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
    }
  };
  const removeDocument = async (slot) => {
    try {
      const documents = await deleteDocument(homestayId, slot);
      setHomestay((current) => ({ ...current, documents }));
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };
  const doGeocode = async (event) => {
    event.preventDefault();
    setGeocodeError("");
    try {
      setGeocodeResults(await geocode(geocodeText.trim()));
    } catch (error) {
      setGeocodeError(getErrorMessage(error));
    }
  };
  const locationForTown = useMemo(() => {
    const town = destinations.find((destination) => destination._id === form.town);
    if (!town?.location?.coordinates) return null;
    const [lng, lat] = town.location.coordinates;
    return { lat, lng };
  }, [destinations, form.town]);
  const photos = [...(homestay?.photos ?? [])].sort((a, b) => a.order - b.order);
  const documentFor = (slot) => homestay?.documents?.find((item) => item.slot === slot);
  const canNavigateTo = (target) => target <= (homestay?.currentStep ?? 1);
  const submitting = submitMutation.isPending;
  const editable = !homestay || ["draft", "changes_requested"].includes(homestay.status);

  if (homestay?.status === "pending") {
    return (
      <>
        <PageHeader eyebrow="Host registration" title="Submitted for verification" subtitle="Your listing is now with our review team." />
        <section className="container section host-submit-success">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 14 }}>
            <span className="host-success-check"><Icon name="check" size={40} strokeWidth={3} /></span>
          </motion.div>
          <h2>Submitted for verification.</h2>
          <p>Our team usually reviews new listings in 3 working days.</p>
          <Button onClick={() => navigate("/host")}>Back to dashboard</Button>
        </section>
      </>
    );
  }

  if (homestay && !editable) {
    return (
      <>
        <PageHeader eyebrow="Host registration" title={homestay.name || "Homestay registration"} subtitle={`This listing is ${homestay.status} and cannot be edited right now.`} />
        <section className="container section">
          <div className="host-error-card">
            <p>Return to your host dashboard to review your listing status.</p>
            <Button onClick={() => navigate("/host")}>Back to dashboard</Button>
          </div>
        </section>
      </>
    );
  }

  if (!homestayId || homestayQuery.isLoading || destinationsQuery.isLoading) {
    return (
      <>
        <PageHeader eyebrow="Host registration" title="Loading your homestay" subtitle="Your draft is saved securely on the server." />
        <section className="container section"><div className="host-form-card"><Skeleton height={420} radius={16} /></div></section>
      </>
    );
  }
  if (homestayQuery.isError) {
    return (
      <>
        <PageHeader eyebrow="Host registration" title="Could not open this homestay" />
        <section className="container section"><div className="host-error-card" role="alert"><p>{getErrorMessage(homestayQuery.error)}</p><Button variant="ghost" onClick={() => navigate("/host")}>Back to dashboard</Button></div></section>
      </>
    );
  }
  if (!homestay && !homestayQuery.isLoading) return null;

  const stepContent = () => {
    if (step === 1) {
      return (
        <div className="host-form-grid">
          <InputField label="Property name" required error={errors.name}><input className="input" maxLength={100} value={form.name} onChange={(event) => updateForm({ name: event.target.value })} /></InputField>
          <InputField label="Owner name" required error={errors.ownerName}><input className="input" maxLength={80} value={form.ownerName} onChange={(event) => updateForm({ ownerName: event.target.value })} /></InputField>
          <PhoneField label="Phone" required value={form.phone} error={errors.phone} onChange={(phone) => updateForm({ phone, ...(form.sameAsPhone ? { whatsapp: phone } : {}) })} />
          <div className="host-phone-block">
            {!form.sameAsPhone && <PhoneField label="WhatsApp" value={form.whatsapp} error={errors.whatsapp} onChange={(whatsapp) => updateForm({ whatsapp })} />}
            <label className="host-checkbox"><input type="checkbox" checked={form.sameAsPhone} onChange={(event) => updateForm({ sameAsPhone: event.target.checked, whatsapp: event.target.checked ? form.phone : form.whatsapp })} /> Same as phone</label>
          </div>
          <InputField label="District / town" required error={errors.town}>
            <select className="input" value={form.town} onChange={(event) => updateForm({ town: event.target.value })}>
              <option value="">Choose a town</option>
              {destinations.filter((place) => !place.isWaypoint).map((place) => <option value={place._id} key={place._id}>{place.name}{place.district ? ` · ${place.district}` : ""}</option>)}
            </select>
          </InputField>
          {destinationsQuery.isError && <p className="field__error host-form-full" role="alert">{getErrorMessage(destinationsQuery.error)} <button type="button" className="link-btn" onClick={() => destinationsQuery.refetch()}>Retry</button></p>}
          <InputField label="Address / landmark" error={errors.addressLandmark} hint="Private. The exact address is not shown to travellers.">
            <input className="input" maxLength={200} value={form.addressLandmark} onChange={(event) => updateForm({ addressLandmark: event.target.value })} />
          </InputField>
          <div className="host-form-full">
            <InputField label="Short description" error={errors.description}>
              <textarea className="input host-textarea" rows={3} maxLength={300} value={form.description} onChange={(event) => updateForm({ description: event.target.value })} />
              <span className="field__counter">{form.description.length}/300</span>
            </InputField>
          </div>
          <div className="host-form-full">
            <span className="field__label">Approximate property location *</span>
            <PinPicker location={form.approxLocation} defaultPosition={locationForTown} onChange={(approxLocation) => updateForm({ approxLocation })} />
            {errors.approxLocation && <span className="field__error" role="alert">{errors.approxLocation}</span>}
            <form className="host-geocode" onSubmit={doGeocode}>
              <input className="input" aria-label="Search a place" placeholder="Search nearby landmark (optional)" value={geocodeText} onChange={(event) => setGeocodeText(event.target.value)} />
              <Button size="sm" variant="ghost" type="submit" disabled={!geocodeText.trim()}>Search map</Button>
            </form>
            {geocodeError && <p className="field__error" role="alert">{geocodeError}</p>}
            {geocodeResults.length > 0 && <div className="host-geocode-results">{geocodeResults.map((item) => <button key={`${item.lat}-${item.lng}`} type="button" onClick={() => { updateForm({ approxLocation: { lat: item.lat, lng: item.lng } }); setGeocodeResults([]); }}>{item.label}</button>)}</div>}
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="stack">
          <div className="host-photo-heading"><p>Add clear photos of your homestay. Upload 3 to 10 JPG or PNG images, up to 5 MB each.</p><Pill tone={photos.length >= 3 ? "ok" : "warn"}>{photos.length} of 3 minimum</Pill></div>
          <FileDropzone
            label="Add property photos"
            hint="Choose JPG or PNG photos. You can upload up to 10 photos, 5 MB each."
            accept="image/jpeg,image/png"
            multiple
            maxFiles={Math.max(1, 10 - photos.length)}
            maxSizeMB={5}
            disabled={!editable || photos.length >= 10}
            onFiles={uploadPhotoFiles}
          />
          {errors.photos && <p className="field__error" role="alert">{errors.photos}</p>}
          {Object.entries(uploading).filter(([key]) => !["certificate", "proof", "id"].includes(key)).map(([key, upload]) => (
            <div className="host-upload-progress" key={key}><span>{upload.name}</span><progress max="100" value={upload.progress} /><span>{upload.progress}%</span></div>
          ))}
          {photos.length > 0 && (
            <ul className="host-photo-grid" aria-label="Uploaded photos">
              {photos.map((photo, index) => (
                <li
                  key={photo._id}
                  draggable={editable}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", photo._id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); movePhoto(event.dataTransfer.getData("text/plain"), photo._id); }}
                >
                  <img src={photo.url} alt={`${photo.label || "Property"} photo ${index + 1}`} />
                  <div className="host-photo-meta"><Pill tone={index === 0 ? "ok" : "mute"}>{index === 0 ? "Cover" : index === 1 ? "Room" : "Exterior"}</Pill><span>Drag to reorder</span></div>
                  <div className="row host-photo-actions">
                    <Button size="sm" variant="ghost" disabled={!editable || index === 0} onClick={() => changePhotoOrder(photo._id, -1)} aria-label="Move photo earlier">←</Button>
                    <Button size="sm" variant="ghost" disabled={!editable || index === photos.length - 1} onClick={() => changePhotoOrder(photo._id, 1)} aria-label="Move photo later">→</Button>
                    <Button size="sm" variant="ghost" disabled={!editable} onClick={() => removePhoto(photo.fileId)}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    if (step === 3) {
      return (
        <div className="host-form-grid">
          <div><Stepper label="Number of rooms" value={form.rooms} min={1} max={20} onChange={(rooms) => updateForm({ rooms })} />{errors.rooms && <p className="field__error" role="alert">{errors.rooms}</p>}</div>
          <div><Stepper label="Maximum guests" value={form.maxGuests} min={1} max={60} onChange={(maxGuests) => updateForm({ maxGuests })} />{errors.maxGuests && <p className="field__error" role="alert">{errors.maxGuests}</p>}</div>
          <div className="host-form-full"><ChoiceChips label="Room types" values={ROOM_TYPES} selected={form.roomTypes} onToggle={(value) => updateForm({ roomTypes: form.roomTypes.includes(value) ? form.roomTypes.filter((item) => item !== value) : [...form.roomTypes, value] })} /></div>
          <div className="host-form-full"><ChoiceChips label="Facilities" values={FACILITIES} selected={form.facilities} onToggle={(value) => updateForm({ facilities: form.facilities.includes(value) ? form.facilities.filter((item) => item !== value) : [...form.facilities, value] })} /></div>
          <InputField label="Other facilities"><input className="input" maxLength={200} value={form.otherFacilities} onChange={(event) => updateForm({ otherFacilities: event.target.value })} /></InputField>
          <InputField label="Price per night" required error={errors.pricePerNight}><input className="input" type="number" min="1" max="100000" value={form.pricePerNight} onChange={(event) => updateForm({ pricePerNight: event.target.value })} /></InputField>
          <InputField label="Peak season price"><input className="input" type="number" min="1" max="100000" value={form.peakPrice} onChange={(event) => updateForm({ peakPrice: event.target.value })} /></InputField>
          <div className="host-form-full"><ChoiceChips label="Open months" values={MONTHS} selected={form.openMonths.map((month) => MONTHS[month - 1])} onToggle={(monthName) => {
            const month = MONTHS.indexOf(monthName) + 1;
            updateForm({ openMonths: form.openMonths.includes(month) ? form.openMonths.filter((item) => item !== month) : [...form.openMonths, month].sort((a, b) => a - b) });
          }} /></div>
          <label className="host-checkbox host-form-full"><input type="checkbox" checked={form.mealsIncluded} onChange={(event) => updateForm({ mealsIncluded: event.target.checked })} /> Meals included in the room price</label>
          <InputField label="Check-in time" error={errors.checkIn}><input className="input" type="time" value={form.checkIn} onChange={(event) => updateForm({ checkIn: event.target.value })} /></InputField>
          <InputField label="Check-out time" error={errors.checkOut}><input className="input" type="time" value={form.checkOut} onChange={(event) => updateForm({ checkOut: event.target.value })} /></InputField>
        </div>
      );
    }
    if (step === 4) {
      return (
        <div className="stack">
          <fieldset className="host-radio-group">
            <legend className="field__label">Tourism licence / approval</legend>
            <label><input type="radio" name="approvalType" checked={form.approval.type === "required"} onChange={() => updateApproval({ type: "required" })} /> Required</label>
            <label><input type="radio" name="approvalType" checked={form.approval.type === "not_applicable"} onChange={() => updateApproval({ type: "not_applicable" })} /> Not applicable</label>
          </fieldset>
          {form.approval.type === "required" ? (
            <div className="host-form-grid">
              <InputField label="Licence number" required error={errors.licenceNumber}><input className="input" maxLength={60} value={form.approval.licenceNumber} onChange={(event) => updateApproval({ licenceNumber: event.target.value })} /></InputField>
              <InputField label="Issuing authority"><input className="input" maxLength={120} value={form.approval.authority} onChange={(event) => updateApproval({ authority: event.target.value })} /></InputField>
              <InputField label="Valid until"><input className="input" type="date" value={form.approval.validUntil ? String(form.approval.validUntil).slice(0, 10) : ""} onChange={(event) => updateApproval({ validUntil: event.target.value })} /></InputField>
              <div className="host-form-full">
                <span className="field__label">Licence certificate *</span>
                <FileDropzone label={documentFor("certificate") ? "Replace licence certificate" : "Upload licence certificate"} accept="application/pdf,image/jpeg,image/png" maxSizeMB={5} disabled={!editable || Boolean(uploading.certificate)} onFiles={([file]) => uploadPrivateDocument(file, "certificate")} />
                {uploading.certificate != null && <progress max="100" value={uploading.certificate} />}
                <UploadedDocument document={documentFor("certificate")} disabled={!editable} onRemove={() => removeDocument("certificate")} />
                {errors.certificate && <p className="field__error" role="alert">{errors.certificate}</p>}
              </div>
            </div>
          ) : (
            <InputField label="Reason approval is not applicable" required error={errors.naReason}>
              <textarea className="input host-textarea" rows={4} maxLength={300} value={form.approval.naReason} onChange={(event) => updateApproval({ naReason: event.target.value })} />
            </InputField>
          )}
        </div>
      );
    }
    if (step === 5) {
      return (
        <div className="stack">
          <p className="host-private-note"><Icon name="shield" /> Documents are visible only to the review team. Verification files are stored privately.</p>
          <div className="host-form-grid">
            <InputField label="Property proof type" required error={errors.proofType}>
              <select className="input" value={form.proofType} onChange={(event) => updateForm({ proofType: event.target.value })}><option value="">Choose proof type</option>{PROOF_TYPES.map((value) => <option key={value}>{value}</option>)}</select>
            </InputField>
            <InputField label="Photo ID type" required error={errors.idType}>
              <select className="input" value={form.idType} onChange={(event) => updateForm({ idType: event.target.value })}><option value="">Choose ID type</option>{ID_TYPES.map((value) => <option key={value}>{value}</option>)}</select>
            </InputField>
            {[
              ["proof", "Proof of property / address"],
              ["id", "Photo ID"]
            ].map(([slot, label]) => (
              <div className="host-form-full" key={slot}>
                <span className="field__label">{label} *</span>
                <FileDropzone
                  label={documentFor(slot) ? "Replace document" : "Upload document"}
                  hint={slot === "proof" && !form.proofType
                    ? "Choose a proof type above before uploading."
                    : slot === "id" && !form.idType
                      ? "Choose an ID type above before uploading."
                      : "Private PDF, JPG or PNG · up to 5 MB"}
                  accept="application/pdf,image/jpeg,image/png"
                  maxSizeMB={5}
                  disabled={!editable || Boolean(uploading[slot]) || (slot === "proof" && !form.proofType) || (slot === "id" && !form.idType)}
                  onFiles={([file]) => uploadPrivateDocument(file, slot)}
                />
                {uploading[slot] != null && <div className="host-upload-progress"><progress max="100" value={uploading[slot]} /><span>{uploading[slot]}%</span></div>}
                <UploadedDocument document={documentFor(slot)} disabled={!editable} onRemove={() => removeDocument(slot)} />
                {errors[slot] && <p className="field__error" role="alert">{errors[slot]}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    const town = destinations.find((place) => place._id === form.town);
    return (
      <div className="host-review-summary">
        <p>Check your details before sending this property to the review team.</p>
        {[
          ["Basics", 1, [[ "Property", form.name ], [ "Owner", form.ownerName ], [ "Phone", `+91 ${form.phone}` ], [ "Town", town?.name || "Not selected" ], [ "Description", form.description || "—" ]]],
          ["Photos", 2, [[ "Uploaded photos", `${photos.length} of 10` ]]],
          ["Rooms", 3, [[ "Rooms / guests", `${form.rooms} rooms · up to ${form.maxGuests} guests` ], [ "Price", form.pricePerNight ? `₹${Number(form.pricePerNight).toLocaleString("en-IN")} per night` : "Not set" ], [ "Facilities", form.facilities.join(", ") || "—" ]]],
          ["Approvals", 4, [[ "Licence", form.approval.type === "required" ? form.approval.licenceNumber || "Not set" : "Not applicable" ], [ "Certificate", documentFor("certificate")?.fileName || "Not uploaded" ]]],
          ["Proof", 5, [[ "Property proof", documentFor("proof")?.fileName || "Not uploaded" ], [ "Photo ID", documentFor("id")?.fileName || "Not uploaded" ]]]
        ].map(([label, target, rows]) => (
          <section className="host-review-section" key={label}>
            <div className="host-section-heading"><h3>{label}</h3><Button size="sm" variant="ghost" disabled={!canNavigateTo(target)} onClick={() => goToStep(target)}>Edit</Button></div>
            <dl>{rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          </section>
        ))}
        <label className="host-checkbox"><input type="checkbox" checked={form.truthful} onChange={(event) => updateForm({ truthful: event.target.checked })} /> I confirm the information and documents are accurate.</label>
        <label className="host-checkbox"><input type="checkbox" checked={form.notGovtCertified} onChange={(event) => updateForm({ notGovtCertified: event.target.checked })} /> I understand approval means documents were checked by the platform and is not government certification.</label>
        {(errors.truthful || errors.notGovtCertified) && <p className="field__error" role="alert">{errors.truthful || errors.notGovtCertified}</p>}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Host registration"
        title={homestay?.name ? `Continue: ${homestay.name}` : "Register your homestay"}
        subtitle="Six steps. Your progress is saved securely on the server as you go."
      >
        <nav className="host-wizard-steps" aria-label="Homestay registration steps">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const completed = number < (homestay?.currentStep ?? 1);
            const disabled = !canNavigateTo(number) || !editable;
            return (
              <button
                type="button"
                key={label}
                data-current={step === number}
                data-complete={completed}
                disabled={disabled}
                aria-current={step === number ? "step" : undefined}
                onClick={() => goToStep(number)}
              >
                <span>{completed ? <Icon name="check" size={14} strokeWidth={3} /> : number}</span>{label}
              </button>
            );
          })}
        </nav>
      </PageHeader>
      <section className="container section host-register">
        {homestay?.status === "changes_requested" && homestay.reviewNote && (
          <aside className="host-review-note host-review-note--page"><strong>Review team requested changes</strong><p>{homestay.reviewNote}</p></aside>
        )}
        {!editable && <p className="host-private-note">This listing is {homestay.status} and is not editable right now.</p>}
        <div className="host-form-card">
          <header className="host-form-card__header">
            <div><p className="page-header__eyebrow">Step {step} of 6</p><h2>{STEPS[step - 1]}</h2></div>
            {homestay.status === "changes_requested" && <Pill tone="warn">Update requested</Pill>}
          </header>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.22 }}
              className="host-step-panel"
            >
              {stepContent()}
            </motion.div>
          </AnimatePresence>
          {serverError && <p className="trip-inline-error" role="alert">{serverError}</p>}
          {saveMutation.isError && !serverError && <p className="trip-inline-error" role="alert">{getErrorMessage(saveMutation.error)}</p>}
          {submitMutation.isError && !serverError && <p className="trip-inline-error" role="alert">{getErrorMessage(submitMutation.error)}</p>}
          <footer className="host-wizard-footer">
            <Button variant="ghost" disabled={step === 1 || savingDraft || submitting} onClick={() => goToStep(step - 1)}>Back</Button>
            <div className="row">
              <Button variant="ghost" disabled={!editable || savingDraft || submitting} loading={savingDraft} onClick={saveDraft}>Save draft</Button>
              {step < 6
                ? <Button disabled={!editable || savingDraft || submitting} loading={savingDraft} onClick={nextStep}>Save &amp; continue</Button>
                : <Button disabled={!editable || !form.truthful || !form.notGovtCertified} loading={submitting} onClick={saveDeclarations}>Submit for verification</Button>}
            </div>
          </footer>
        </div>
      </section>
    </>
  );
}
