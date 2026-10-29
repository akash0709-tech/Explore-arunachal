// The /plan page can be opened with choices already filled in, through the URL:
//   /plan?citizen=indian&start=<startCityId>&days=6&dest=<destinationId>,<destinationId>
// Home's quick-plan card, destination cards and the Permit Wizard all build links with this.

export function buildPlanUrl({ citizen, startId, days, destinationIds } = {}) {
  const params = new URLSearchParams();
  if (citizen) params.set("citizen", citizen);
  if (startId) params.set("start", startId);
  if (days) params.set("days", String(days));
  if (destinationIds?.length) params.set("dest", destinationIds.join(","));
  const query = params.toString();
  return query ? `/plan?${query}` : "/plan";
}

/** Reads the same values back (used by the plan page). */
export function readPlanQuery(searchParams) {
  const days = Number(searchParams.get("days"));
  return {
    citizen: ["indian", "foreign"].includes(searchParams.get("citizen"))
      ? searchParams.get("citizen")
      : undefined,
    startId: searchParams.get("start") || undefined,
    days: Number.isInteger(days) && days > 0 ? days : undefined,
    destinationIds: (searchParams.get("dest") || "").split(",").filter(Boolean)
  };
}
