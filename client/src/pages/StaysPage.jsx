import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Pill } from "../components/ui/Pill.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useDestinations } from "../features/destinations/useDestinationData.js";
import { StayMap } from "../features/stays/StayMap.jsx";
import { listStays } from "../api/stays.js";
import { getErrorMessage } from "../utils/apiErrors.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

const FACILITIES = [
  { value: "Wi-Fi", label: "Wi-Fi" },
  { value: "Meals", label: "Meals" },
  { value: "Heated", label: "Heater" },
  { value: "Parking", label: "Parking" }
];
const PAGE_SIZE = 12;

function readFilters(params) {
  const maxPrice = Number(params.get("maxPrice"));
  const minRooms = Number(params.get("minRooms"));
  return {
    town: params.get("town") ?? "",
    maxPrice: Number.isFinite(maxPrice) && maxPrice >= 500 ? Math.min(15000, maxPrice) : 15000,
    minRooms: Number.isInteger(minRooms) && minRooms >= 1 ? minRooms : 1,
    facilities: (params.get("facilities") ?? "").split(",").filter(Boolean)
  };
}

function filterParams(filters) {
  const params = new URLSearchParams();
  if (filters.town) params.set("town", filters.town);
  if (filters.maxPrice < 15000) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minRooms > 1) params.set("minRooms", String(filters.minRooms));
  if (filters.facilities.length) params.set("facilities", [...filters.facilities].sort().join(","));
  return params;
}

function StayCard({ stay }) {
  return (
    <article className="stay-card">
      <Link className="stay-card__image-link" to={`/stays/${stay._id}`} aria-label={`View ${stay.name}`}>
        {stay.thumbnailUrl ? (
          <img className="stay-card__image" src={stay.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <span className="stay-card__image stay-card__image--empty" aria-hidden="true">Explore Arunachal</span>
        )}
      </Link>
      <div className="stay-card__body">
        <div className="stay-card__title-row">
          <div>
            <h2><Link to={`/stays/${stay._id}`}>{stay.name}</Link></h2>
            <p className="text-muted">{stay.town?.name}{stay.hostName ? ` · Hosted by ${stay.hostName}` : ""}</p>
          </div>
          <Pill tone="ok" icon="check">Approved by platform</Pill>
        </div>
        <p className="text-small">
          {stay.rooms} room{stay.rooms === 1 ? "" : "s"}
          {stay.maxGuests ? ` · Up to ${stay.maxGuests} guests` : ""}
        </p>
        <div className="stay-card__facilities" aria-label="Facilities">
          {(stay.facilities ?? []).slice(0, 5).map((facility) => (
            <span className="stay-facility-tag" key={facility}>{facility}</span>
          ))}
        </div>
        <div className="stay-card__footer">
          <p><strong>₹{stay.pricePerNight?.toLocaleString("en-IN")}</strong><span> / night</span></p>
          <ButtonLink to={`/stays/${stay._id}`}>View</ButtonLink>
        </div>
      </div>
    </article>
  );
}

function StayCardSkeleton() {
  return (
    <div className="stay-card stay-card--skeleton" aria-hidden="true">
      <Skeleton height={210} />
      <div className="stack" style={{ padding: 16 }}>
        <Skeleton height={24} width="65%" />
        <Skeleton height={16} width="45%" />
        <Skeleton height={36} />
      </div>
    </div>
  );
}

export default function StaysPage() {
  const isOnline = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: destinations = [], isLoading: destinationsLoading } = useDestinations();
  const appliedFilters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState("list");

  useEffect(() => setDraftFilters(appliedFilters), [appliedFilters]);

  const staysQuery = useInfiniteQuery({
    queryKey: ["stays", appliedFilters],
    queryFn: ({ pageParam = 1 }) => listStays({ ...appliedFilters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    networkMode: "always",
    retry: false
  });
  const stays = staysQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = staysQuery.data?.pages[0]?.pagination.total ?? 0;

  const updateDraft = (changes) => setDraftFilters((current) => ({ ...current, ...changes }));
  const toggleFacility = (value) =>
    updateDraft({
      facilities: draftFilters.facilities.includes(value)
        ? draftFilters.facilities.filter((facility) => facility !== value)
        : [...draftFilters.facilities, value]
    });
  const applyFilters = (event) => {
    event.preventDefault();
    if (!isOnline) return;
    setSearchParams(filterParams(draftFilters));
    setFiltersOpen(false);
  };
  const resetFilters = () => {
    if (!isOnline) return;
    const reset = { town: "", maxPrice: 15000, minRooms: 1, facilities: [] };
    setDraftFilters(reset);
    setSearchParams(new URLSearchParams());
  };

  return (
    <>
      <PageHeader
        eyebrow="Verified local hosts"
        title="Verified homestays"
        subtitle="Stays checked by our review team. Contact hosts directly by call or WhatsApp."
      />

      <section className="container section stays-layout">
        <aside className={`stays-filters${filtersOpen ? " stays-filters--open" : ""}`}>
          <div className="stays-filters__heading">
            <h2>Filters</h2>
            <Button className="stays-filter-toggle" variant="ghost" size="sm" onClick={() => setFiltersOpen((open) => !open)}>
              {filtersOpen ? "Hide filters" : "Show filters"}
            </Button>
          </div>
          <form className="stack" onSubmit={applyFilters}>
            <label className="field">
              <span className="field__label">Town</span>
              <select
                className="select"
                value={draftFilters.town}
                disabled={destinationsLoading}
                onChange={(event) => updateDraft({ town: event.target.value })}
              >
                <option value="">All towns</option>
                {destinations.map((town) => <option key={town._id} value={town.slug}>{town.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="row" style={{ justifyContent: "space-between" }}>
                <span className="field__label">Price per night</span>
                <strong>₹{draftFilters.maxPrice.toLocaleString("en-IN")}</strong>
              </span>
              <input
                type="range"
                min="500"
                max="15000"
                step="500"
                value={draftFilters.maxPrice}
                onChange={(event) => updateDraft({ maxPrice: Number(event.target.value) })}
                aria-label="Maximum price per night"
              />
              <span className="field__hint">Up to ₹15,000</span>
            </label>

            <label className="field">
              <span className="field__label">Rooms at least</span>
              <select
                className="select"
                value={draftFilters.minRooms}
                onChange={(event) => updateDraft({ minRooms: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option value={count} key={count}>{count}{count === 5 ? "+" : ""} room{count === 1 ? "" : "s"}</option>
                ))}
              </select>
            </label>

            <fieldset className="field stays-facility-filter">
              <legend className="field__label">Facilities</legend>
              {FACILITIES.map((facility) => (
                <label className="checkbox" key={facility.value}>
                  <input
                    type="checkbox"
                    checked={draftFilters.facilities.includes(facility.value)}
                    onChange={() => toggleFacility(facility.value)}
                  />
                  <span>{facility.label}</span>
                </label>
              ))}
            </fieldset>

            <div className="row">
              <Button
                type="submit"
                disabled={!isOnline}
                title={!isOnline ? "Connect to the internet to apply homestay filters." : undefined}
              >
                Apply filters
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!isOnline}
                title={!isOnline ? "Connect to the internet to reset homestay filters." : undefined}
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          </form>
        </aside>

        <div className="stays-results">
          <div className="stays-results__toolbar">
            <p aria-live="polite">
              {staysQuery.isLoading ? "Finding stays…" : `${total} verified homestay${total === 1 ? "" : "s"}`}
            </p>
            <div className="segmented stays-view-toggle" role="group" aria-label="Results view">
              <button type="button" className="segmented__option" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
              <button type="button" className="segmented__option" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
            </div>
          </div>

          {staysQuery.isError ? (
            <EmptyState icon="alert" title="Could not load homestays">
              {getErrorMessage(staysQuery.error)}
              <Button
                disabled={!isOnline}
                title={!isOnline ? "Connect to the internet to reload homestays." : undefined}
                onClick={() => staysQuery.refetch()}
              >
                Try again
              </Button>
            </EmptyState>
          ) : staysQuery.isLoading ? (
            <div className="stay-list">{Array.from({ length: 3 }, (_, index) => <StayCardSkeleton key={index} />)}</div>
          ) : stays.length === 0 ? (
            <EmptyState
              icon="home"
              title="No homestays match these filters"
              action={
                <Button
                  disabled={!isOnline}
                  title={!isOnline ? "Connect to the internet to reset homestay filters." : undefined}
                  onClick={resetFilters}
                >
                  Reset filters
                </Button>
              }
            >
              Try another town, a higher price limit or fewer facilities.
            </EmptyState>
          ) : view === "map" ? (
            <StayMap stays={stays} />
          ) : (
            <>
              <div className="stay-list">{stays.map((stay) => <StayCard stay={stay} key={stay._id} />)}</div>
              {staysQuery.hasNextPage && (
                <div className="stays-load-more">
                  <Button
                    variant="ghost"
                    loading={staysQuery.isFetchingNextPage}
                    disabled={!isOnline}
                    title={!isOnline ? "Connect to the internet to load more homestays." : undefined}
                    onClick={() => staysQuery.fetchNextPage()}
                  >
                    Load more homestays
                  </Button>
                </div>
              )}
              {staysQuery.isFetchNextPageError && (
                <p className="trip-inline-error" role="alert">
                  Could not load more homestays.{" "}
                  <button
                    type="button"
                    className="link-btn"
                    disabled={!isOnline}
                    title={!isOnline ? "Connect to the internet to load more homestays." : undefined}
                    onClick={() => staysQuery.fetchNextPage()}
                  >
                    Try again
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
