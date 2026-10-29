const TRIP_CACHE_FRAGMENT = "trip-pack";
const IMAGE_CACHE_FRAGMENT = "saved-host-images";
const TRIPS_PATH = /^\/api\/trips$/;

async function cacheNamesContaining(fragment) {
  if (!("caches" in globalThis)) return [];
  return (await caches.keys()).filter((name) => name.includes(fragment));
}

async function cacheKeysFor(fragment) {
  const names = await cacheNamesContaining(fragment);
  const entries = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()));
  return entries.flat();
}

async function findCachedResponse(fragment, predicate) {
  const names = await cacheNamesContaining(fragment);
  for (const name of names) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (predicate(new URL(request.url))) {
        const response = await cache.match(request);
        if (response) return response;
      }
    }
  }
  return null;
}

export async function hasCachedTripList() {
  const requests = await cacheKeysFor(TRIP_CACHE_FRAGMENT);
  return requests.some((request) => TRIPS_PATH.test(new URL(request.url).pathname));
}

export async function hasCachedTrip(id) {
  if (!id) return false;
  const requests = await cacheKeysFor(TRIP_CACHE_FRAGMENT);
  const tripPath = `/api/trips/${encodeURIComponent(id)}`;
  return requests.some((request) => new URL(request.url).pathname === tripPath);
}

export async function hasCachedTripPack(id, { permitSlugs = [], weatherSlug, hasSavedHosts = false } = {}) {
  const tripPath = `/api/trips/${encodeURIComponent(id)}`;
  const [tripResponse, tripRequests] = await Promise.all([
    findCachedResponse(TRIP_CACHE_FRAGMENT, (url) => url.pathname === tripPath),
    cacheKeysFor(TRIP_CACHE_FRAGMENT)
  ]);
  if (!tripResponse) return false;

  const paths = tripRequests.map((request) => new URL(request.url));
  const permitCached = paths.some((url) => url.pathname === "/api/permits/check") &&
    paths.some((url) => {
      if (url.pathname !== "/api/permits/check") return false;
      const requestedSlugs = (url.searchParams.get("destinations") ?? "").split(",").sort();
      return requestedSlugs.join(",") === [...permitSlugs].sort().join(",");
    });
  const weatherCached = !weatherSlug || paths.some((url) =>
    url.pathname === `/api/weather/destination/${encodeURIComponent(weatherSlug)}`
  );
  const tripPayload = await tripResponse.json();
  const hosts = tripPayload?.data?.trip?.savedHostIds;
  if (!Array.isArray(hosts)) throw new Error("The cached trip response is missing its saved host list.");
  const imageUrls = hosts.flatMap((host) => (host.photos ?? []).map((photo) => photo.url).filter(Boolean));
  const imageRequests = await cacheKeysFor(IMAGE_CACHE_FRAGMENT);
  const cachedImageUrls = new Set(imageRequests.map((request) => request.url));
  const hostsCached = !hasSavedHosts || imageUrls.every((url) => cachedImageUrls.has(url));
  return permitCached && weatherCached && hostsCached;
}

export async function clearPrivateTripCaches() {
  const names = await cacheNamesContaining(TRIP_CACHE_FRAGMENT);
  const results = await Promise.all(names.map((name) => caches.delete(name)));
  if (results.some((deleted) => !deleted)) {
    throw new Error("One or more private trip caches could not be cleared.");
  }
}

export async function removeCachedTrip(id) {
  const tripPath = `/api/trips/${encodeURIComponent(id)}`;
  const names = await cacheNamesContaining(TRIP_CACHE_FRAGMENT);
  await Promise.all(names.map(async (name) => {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (new URL(request.url).pathname === tripPath) await cache.delete(request);
    }
  }));
}
