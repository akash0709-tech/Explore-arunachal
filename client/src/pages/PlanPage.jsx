import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { ProgressSteps } from "../components/ui/ProgressSteps.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { Chip, ChipGroup } from "../components/ui/Chip.jsx";
import { Stepper } from "../components/ui/Stepper.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { TripResults } from "../features/trips/TripResults.jsx";
import { useDestinations, useStartCities } from "../features/destinations/useDestinationData.js";
import { previewTrip, createTrip, getTrip, updateTrip } from "../api/trips.js";
import { getPlanGeometry } from "../api/maps.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { useAuth } from "../hooks/useAuth.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";
import { formatRupees } from "../utils/format.js";
import { getErrorMessage } from "../utils/apiErrors.js";

const STEPS = ["Trip", "Permit", "Plan", "Stay", "Save"];
const INTERESTS = ["Nature", "Culture", "Monasteries", "Adventure", "Wildlife", "Food"];
const NO_DESTINATIONS = [];
const NO_START_CITIES = [];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DEFAULT_FORM = {
  citizen: "indian",
  startId: "",
  destinationIds: [],
  days: 5,
  travellers: 2,
  month: new Date().getMonth() + 1,
  transportMode: "shared",
  interests: [],
  budgetPerPerson: 20000
};

function readForm(searchParams) {
  const days = Number(searchParams.get("days"));
  const travellers = Number(searchParams.get("travellers"));
  const month = Number(searchParams.get("month"));
  const budget = Number(searchParams.get("budget"));
  const interests = (searchParams.get("interests") || "").split(",").filter(Boolean);
  return {
    ...DEFAULT_FORM,
    citizen: searchParams.get("citizen") === "foreign" ? "foreign" : "indian",
    startId: searchParams.get("start") || "",
    destinationIds: (searchParams.get("dest") || "").split(",").filter(Boolean),
    days: Number.isInteger(days) && days >= 1 && days <= 21 ? days : DEFAULT_FORM.days,
    travellers:
      Number.isInteger(travellers) && travellers >= 1 && travellers <= 12
        ? travellers
        : DEFAULT_FORM.travellers,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : DEFAULT_FORM.month,
    transportMode: searchParams.get("transport") === "private" ? "private" : "shared",
    interests: interests.slice(0, 10),
    budgetPerPerson:
      Number.isInteger(budget) && budget >= 4000 && budget <= 60000 ? budget : DEFAULT_FORM.budgetPerPerson
  };
}

function serializeForm(form, searchParams, editId) {
  const params = new URLSearchParams(searchParams);
  params.set("citizen", form.citizen);
  if (form.startId) params.set("start", form.startId);
  else params.delete("start");
  if (form.destinationIds.length) params.set("dest", form.destinationIds.join(","));
  else params.delete("dest");
  params.set("days", String(form.days));
  params.set("travellers", String(form.travellers));
  params.set("month", String(form.month));
  params.set("transport", form.transportMode);
  params.set("budget", String(form.budgetPerPerson));
  if (form.interests.length) params.set("interests", form.interests.join(","));
  else params.delete("interests");
  if (editId) params.set("edit", editId);
  else params.delete("edit");
  return params.toString();
}

function formFromTrip(trip) {
  return {
    citizen: trip.citizen,
    startId: trip.startId?._id ?? trip.startId,
    destinationIds: (trip.destinationIds ?? []).map((place) => place?._id ?? place),
    days: trip.days,
    travellers: trip.travellers,
    month: trip.month,
    transportMode: trip.transportMode,
    interests: trip.interests ?? [],
    budgetPerPerson: trip.budgetPerPerson ?? DEFAULT_FORM.budgetPerPerson
  };
}

export default function PlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const editId = searchParams.get("edit");
  const [form, setForm] = useState(() => readForm(searchParams));
  const [loadedEditId, setLoadedEditId] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [saveError, setSaveError] = useState("");
  const resultsRef = useRef(null);

  const destinationsQuery = useDestinations();
  const startCitiesQuery = useStartCities();
  const destinations = destinationsQuery.data ?? NO_DESTINATIONS;
  const startCities = startCitiesQuery.data ?? NO_START_CITIES;
  const destinationsLoading = destinationsQuery.isLoading;
  const startCitiesLoading = startCitiesQuery.isLoading;
  const editQuery = useQuery({
    queryKey: ["trips", editId],
    queryFn: () => getTrip(editId),
    enabled: Boolean(editId && user)
  });

  useEffect(() => {
    if (!editId || !editQuery.data || loadedEditId === editId) return;
    setForm(formFromTrip(editQuery.data));
    setLoadedEditId(editId);
    setSelectedResult(null);
  }, [editId, editQuery.data, loadedEditId]);

  useEffect(() => {
    if (editId && !loadedEditId) return;
    if (!form.startId && startCities.length) {
      setForm((current) => ({ ...current, startId: startCities[0]._id }));
    }
  }, [editId, form.startId, loadedEditId, startCities]);

  useEffect(() => {
    if (editId && !loadedEditId) return;
    const search = serializeForm(form, searchParams, editId);
    const next = search ? `?${search}` : "";
    if (next !== location.search) {
      navigate({ pathname: location.pathname, search: next }, { replace: true });
    }
  }, [editId, form, loadedEditId, location.pathname, location.search, navigate, searchParams]);

  const selectedDestinations = useMemo(
    () => form.destinationIds.map((id) => destinations.find((place) => place._id === id)).filter(Boolean),
    [destinations, form.destinationIds]
  );
  const availableDestinations = useMemo(
    () =>
      destinations.filter(
        (place) => place._id !== form.startId && !form.destinationIds.includes(place._id)
      ),
    [destinations, form.destinationIds, form.startId]
  );

  const validForPreview =
    Boolean(form.startId) &&
    form.destinationIds.some((id) => id !== form.startId) &&
    form.destinationIds.length <= 6;
  const inputKey = JSON.stringify(form);
  const debouncedInputKey = useDebouncedValue(inputKey, 400);
  const estimateQuery = useQuery({
    queryKey: ["trips", "live-preview", debouncedInputKey],
    queryFn: () => previewTrip(JSON.parse(debouncedInputKey)),
    enabled: isOnline && validForPreview && debouncedInputKey === inputKey,
    networkMode: "always",
    retry: false,
    staleTime: 0
  });

  const planMutation = useMutation({ mutationFn: previewTrip });
  const saveMutation = useMutation({
    mutationFn: (input) => (editId ? updateTrip(editId, input) : createTrip(input)),
    onSuccess: async (trip) => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/trips/${trip._id}`);
    }
  });

  const updateForm = (changes) => {
    setForm((current) => {
      const next = typeof changes === "function" ? changes(current) : { ...current, ...changes };
      return next;
    });
    setSelectedResult(null);
    setSaveError("");
  };

  const toggleInterest = (interest) =>
    updateForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest]
    }));

  const handleBuildPlan = async () => {
    if (!isOnline) return;
    setSaveError("");
    try {
      const result = await planMutation.mutateAsync(form);
      setSelectedResult(result);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      setSaveError(getErrorMessage(error));
    }
  };

  const handleSave = async () => {
    if (!isOnline) return;
    if (!user) {
      navigate("/login", {
        state: {
          from: { pathname: "/plan", search: location.search, hash: "" }
        }
      });
      return;
    }
    setSaveError("");
    try {
      await saveMutation.mutateAsync(form);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    }
  };

  const estimate = estimateQuery.data;
  const cost = estimate?.plan?.cost;
  const budgetPercent = cost
    ? Math.min(100, Math.round((cost.total / form.budgetPerPerson) * 100))
    : 0;
  const overBudget = Boolean(cost && cost.total > form.budgetPerPerson);
  const result = selectedResult;
  const resultStops = result
    ? [form.startId, ...result.plan.orderedDestinations.map((place) => place.id), form.startId]
    : [];
  const geometryQuery = useQuery({
    queryKey: ["maps", "plan-geometry", resultStops],
    queryFn: () => getPlanGeometry(resultStops),
    enabled: resultStops.length > 2
  });

  if (editId && !authLoading && !user) {
    return <Navigate to="/login" replace state={{ from: { pathname: "/plan", search: location.search } }} />;
  }
  if (editId && user && editQuery.isLoading) {
    return <div className="container section"><Skeleton height={160} /></div>;
  }
  if (editId && editQuery.isError) {
    return (
      <>
        <PageHeader eyebrow="Your itinerary" title="Could not load this trip" />
        <div className="container section"><p className="trip-inline-error" role="alert">{getErrorMessage(editQuery.error)}</p></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Smart Itinerary"
        title={editId ? "Edit your trip" : "Plan your trip"}
        subtitle="Build a day-by-day plan with realistic hill-road times, permits and cost estimates."
      >
        <ProgressSteps steps={STEPS} current={selectedResult ? 3 : 1} label="Trip planning progress" />
      </PageHeader>

      <section className="container section trip-layout">
        <div className="trip-main">
          <Card className="stack trip-form-card" as="form" onSubmit={(event) => event.preventDefault()}>
            {destinationsQuery.isError && (
              <p className="trip-inline-error" role="alert">Could not load destinations: {getErrorMessage(destinationsQuery.error)}</p>
            )}
            {startCitiesQuery.isError && (
              <p className="trip-inline-error" role="alert">Could not load start cities: {getErrorMessage(startCitiesQuery.error)}</p>
            )}
            <SegmentedControl
              label="Citizenship"
              options={[
                { value: "indian", label: "Indian citizen" },
                { value: "foreign", label: "Foreign national" }
              ]}
              value={form.citizen}
              onChange={(citizen) => updateForm({ citizen })}
            />

            <label className="field">
              <span className="field__label">Start city</span>
              {startCitiesLoading ? (
                <Skeleton height={46} />
              ) : (
                <select
                  className="select"
                  value={form.startId}
                  onChange={(event) =>
                    updateForm((current) => ({
                      ...current,
                      startId: event.target.value,
                      destinationIds: current.destinationIds.filter((id) => id !== event.target.value)
                    }))
                  }
                >
                  <option value="">Choose a start city</option>
                  {startCities.map((city) => <option key={city._id} value={city._id}>{city.name}</option>)}
                </select>
              )}
            </label>

            <div className="field">
              <span className="field__label">Destinations</span>
              {destinationsLoading ? <Skeleton height={42} /> : (
                <>
                  <ChipGroup label="Selected destinations">
                    {selectedDestinations.map((place) => (
                      <Chip
                        key={place._id}
                        selected
                        onToggle={() => updateForm((current) => ({
                          ...current,
                          destinationIds: current.destinationIds.filter((id) => id !== place._id)
                        }))}
                        aria-label={`Remove ${place.name}`}
                      >
                        {place.name}{place.altitudeM ? ` · ${Math.round(place.altitudeM).toLocaleString("en-IN")} m` : ""}
                      </Chip>
                    ))}
                  </ChipGroup>
                  <label className="trip-add-destination">
                    <span className="sr-only">Add a destination</span>
                    <select
                      className="select"
                      value=""
                      disabled={availableDestinations.length === 0 || form.destinationIds.length >= 6}
                      onChange={(event) => {
                        const id = event.target.value;
                        if (id) updateForm((current) => ({ ...current, destinationIds: [...current.destinationIds, id] }));
                      }}
                    >
                      <option value="">+ Add a destination</option>
                      {availableDestinations.map((place) => (
                        <option key={place._id} value={place._id}>
                          {place.name}{place.altitudeM ? ` · ${Math.round(place.altitudeM).toLocaleString("en-IN")} m` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="field__hint">Choose 1–6 places. Add at least one place besides your start city.</span>
                </>
              )}
            </div>

            <div className="trip-form-grid">
              <Stepper label="Trip length" value={form.days} onChange={(days) => updateForm({ days })} min={1} max={21} suffix="days" />
              <Stepper label="Travellers" value={form.travellers} onChange={(travellers) => updateForm({ travellers })} min={1} max={12} />
              <label className="field">
                <span className="field__label">Travel month</span>
                <select className="select" value={form.month} onChange={(event) => updateForm({ month: Number(event.target.value) })}>
                  {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                </select>
              </label>
            </div>

            <SegmentedControl
              label="Getting around"
              options={[
                { value: "shared", label: "Shared taxi" },
                { value: "private", label: "Private car" }
              ]}
              value={form.transportMode}
              onChange={(transportMode) => updateForm({ transportMode })}
            />

            <div className="field">
              <span className="field__label">What are you interested in?</span>
              <ChipGroup label="Trip interests">
                {INTERESTS.map((interest) => (
                  <Chip
                    key={interest}
                    selected={form.interests.includes(interest)}
                    onToggle={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Chip>
                ))}
              </ChipGroup>
            </div>

            <label className="field trip-budget-control">
              <span className="row" style={{ justifyContent: "space-between" }}>
                <span className="field__label">Budget per person</span>
                <strong>{formatRupees(form.budgetPerPerson)}</strong>
              </span>
              <input
                type="range"
                min="4000"
                max="60000"
                step="1000"
                value={form.budgetPerPerson}
                onChange={(event) => updateForm({ budgetPerPerson: Number(event.target.value) })}
                aria-label="Budget per person"
              />
              <span className="row trip-budget-control__range"><span>₹4,000</span><span>₹60,000</span></span>
            </label>

            {!validForPreview && form.destinationIds.length > 0 && (
              <p className="trip-inline-error" role="alert">Choose a destination other than your start city.</p>
            )}
            {saveError && <p className="trip-inline-error" role="alert">{saveError}</p>}

            <div className="row">
              <Button
                size="lg"
                loading={planMutation.isPending}
                disabled={!validForPreview || !isOnline}
                title={!isOnline ? "Connect to the internet to build a plan." : undefined}
                onClick={handleBuildPlan}
              >
                Check permit &amp; build plan
              </Button>
              <Button
                variant="ghost"
                onClick={handleSave}
                loading={saveMutation.isPending}
                disabled={!validForPreview || !isOnline}
                title={!isOnline ? "Connect to the internet to save this trip." : undefined}
              >
                {editId ? "Save changes" : "Save trip"}
              </Button>
            </div>
          </Card>

          <div ref={resultsRef} className="trip-results-anchor">
            {result && (
              <TripResults
                citizen={form.citizen}
                plan={result.plan}
                orderedDestinations={result.plan.orderedDestinations}
                weather={result.weather}
                geometry={geometryQuery.data}
                geometryLoading={geometryQuery.isLoading}
                geometryError={geometryQuery.isError ? getErrorMessage(geometryQuery.error) : ""}
                travellers={form.travellers}
                actions={
                  <>
                    <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Edit plan</Button>
                    <Button variant="ghost" disabled={!isOnline} title={!isOnline ? "Connect to the internet to browse homestays." : undefined} onClick={() => {
                      const last = result.plan.orderedDestinations.at(-1);
                      navigate(`/stays?town=${encodeURIComponent(last?.slug ?? "")}`);
                    }}>Find stays on this route</Button>
                    <Button
                      onClick={handleSave}
                      loading={saveMutation.isPending}
                      disabled={!isOnline}
                      title={!isOnline ? "Connect to the internet to save this trip." : undefined}
                    >
                      {editId ? "Save changes" : "Save trip"}
                    </Button>
                  </>
                }
              />
            )}
          </div>
        </div>

        <aside className="trip-estimate">
          <Card className="stack trip-estimate__card">
            <div>
              <p className="page-header__eyebrow">Live estimate</p>
              <h2>Your trip so far</h2>
            </div>
            {!isOnline ? (
              <p className="text-muted">Connect to the internet to get a live trip estimate.</p>
            ) : !validForPreview ? (
              <p className="text-muted">Choose your start city and at least one destination to see the estimate.</p>
            ) : estimateQuery.isError ? (
              <p className="trip-inline-error" role="alert">{getErrorMessage(estimateQuery.error)}</p>
            ) : estimate ? (
              <>
                <div className="trip-estimate__total" aria-live="polite">
                  <span>Estimated per person</span>
                  <strong>{formatRupees(cost.total)}</strong>
                </div>
                <div
                  className={`trip-budget-meter${overBudget ? " trip-budget-meter--over" : ""}`}
                  role="meter"
                  aria-label="Budget used"
                  aria-valuemin={0}
                  aria-valuemax={form.budgetPerPerson}
                  aria-valuenow={Math.min(cost.total, form.budgetPerPerson)}
                  aria-valuetext={`${formatRupees(cost.total)} of ${formatRupees(form.budgetPerPerson)}`}
                >
                  <i style={{ width: `${budgetPercent}%` }} />
                </div>
                <p className="text-small">
                  {overBudget ? "This estimate is over your budget." : `${formatRupees(form.budgetPerPerson - cost.total)} left in your budget.`}
                </p>
                <div className="trip-estimate__detail">
                  <strong>Route</strong>
                  <span>{estimate.plan.orderedDestinations.map((place) => place.name).join(" → ")}</span>
                  <small>{formatRupees(cost.total)} · {estimate.plan.days.length} planned days · {Math.round(estimate.plan.totalKm)} km</small>
                </div>
                <div className="trip-estimate__detail">
                  <strong>Permit</strong>
                  <span>{estimate.permitSnapshot?.title ?? estimate.extraPermits?.[0]?.title ?? "No permit identified"}</span>
                </div>
                {estimateQuery.isFetching && <span className="field__hint" role="status">Updating estimate…</span>}
              </>
            ) : (
              <div role="status"><Skeleton height={72} /><Skeleton height={48} /></div>
            )}
          </Card>
        </aside>
      </section>
    </>
  );
}
