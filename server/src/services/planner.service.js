import { ApiError } from "../utils/ApiError.js";

// ----- Planning rules (change them here) -----
export const MAX_DRIVE_HOURS_PER_DAY = 9.5;
export const LONG_DRIVE_HOURS = 7; //        warn above this: "leave by 6 am"
export const HIGH_ALTITUDE_M = 2800; //      warn about the first night above this
const MONSOON_MONTHS = [6, 7, 8, 9]; //      June-September: landslides, slower roads
const WINTER_MONTHS = [12, 1, 2, 3]; //      December-March: snow on high passes

// ----- Cost rules (per person, INR) -----
const SHARED_FARE_PER_KM = 3.2; //     fallback when a route has no shared-taxi fare
const PRIVATE_FARE_PER_KM = 28; //     fallback per vehicle
const LOCAL_DAY_VEHICLE_COST = 1500; // private car for a sightseeing day, per vehicle
const FOOD_PER_DAY = 550;
const PEOPLE_PER_ROOM = 2;
export const STAY_TIERS = [
  { name: "simple", maxBudgetPerDay: 2200, ratePerRoom: 1300 },
  { name: "comfortable", maxBudgetPerDay: 3800, ratePerRoom: 2200 },
  { name: "premium", maxBudgetPerDay: Infinity, ratePerRoom: 3800 }
];

// ----- Small helpers -----
const key = (value) => String(value); // ObjectIds and strings compare the same way
const roundHours = (hours) => Math.round(hours * 4) / 4; // nearest quarter hour
const roundRupees = (amount) => Math.round(amount / 10) * 10; // nearest Rs 10
const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

/**
 * Builds an adjacency list: placeId -> [{ to, route }].
 * Roads work in both directions, so every route is added twice.
 */
export function buildGraph(routes) {
  const graph = new Map();
  const addEdge = (from, to, route) => {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push({ to, route });
  };
  for (const route of routes) {
    addEdge(key(route.fromId), key(route.toId), route);
    addEdge(key(route.toId), key(route.fromId), route);
  }
  return graph;
}

/**
 * Dijkstra's algorithm: the path with the fewest hill hours between two places.
 * Returns { legs, hours, km } or null when no road connects them.
 * Each leg: { fromId, toId, km, hours, isPass, monsoonFactor, winterFactor, fares }.
 *
 * The "queue" is a plain array sorted each round. With a few dozen places that is
 * fast enough and much easier to read than a heap.
 */
export function shortestPath(graph, fromId, toId) {
  const start = key(fromId);
  const goal = key(toId);
  if (start === goal) return { legs: [], hours: 0, km: 0 };

  const bestHours = new Map([[start, 0]]); // shortest time found so far to each place
  const cameFrom = new Map(); //             place -> { from, route } on that shortest path
  const done = new Set();
  const queue = [{ place: start, hours: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.hours - b.hours);
    const { place, hours } = queue.shift(); // closest place not finished yet
    if (done.has(place)) continue;
    done.add(place);
    if (place === goal) break;

    for (const { to, route } of graph.get(place) ?? []) {
      const viaHere = hours + route.hillHours;
      if (viaHere < (bestHours.get(to) ?? Infinity)) {
        bestHours.set(to, viaHere);
        cameFrom.set(to, { from: place, route });
        queue.push({ place: to, hours: viaHere });
      }
    }
  }

  if (!bestHours.has(goal)) return null;

  // Walk backwards from the goal to rebuild the list of legs
  const legs = [];
  for (let place = goal; place !== start;) {
    const { from, route } = cameFrom.get(place);
    legs.unshift({
      fromId: from,
      toId: place,
      km: route.roadKm,
      hours: route.hillHours,
      isPass: Boolean(route.isPass),
      monsoonFactor: route.monsoonFactor ?? 1.25,
      winterFactor: route.winterFactor ?? 1.4,
      fares: route.fares ?? {}
    });
    place = from;
  }

  return { legs, hours: bestHours.get(goal), km: sum(legs, (leg) => leg.km) };
}

/**
 * Seasonal drive time for one leg:
 *   June-September (monsoon): every road x monsoonFactor (default 1.25)
 *   December-March (winter):  only pass roads x winterFactor (default 1.4)
 */
export function applySeason(hours, leg, month) {
  if (MONSOON_MONTHS.includes(month)) return hours * (leg.monsoonFactor ?? 1.25);
  if (WINTER_MONTHS.includes(month) && leg.isPass) return hours * (leg.winterFactor ?? 1.4);
  return hours;
}

/**
 * Groups consecutive legs into drive days.
 * Keep adding legs to today until the next one would take the day past maxHoursPerDay.
 * Exception: a day never ends ON a mountain pass (leg.endsOnPass); we keep driving to
 * the next stop, because nobody can stay the night at the top of Sela Pass.
 * Returns an array of days, each an array of legs.
 */
export function splitIntoDriveDays(legs, maxHoursPerDay = MAX_DRIVE_HOURS_PER_DAY) {
  const days = [];
  let today = [];
  let todayHours = 0;

  for (const leg of legs) {
    const wouldPassLimit = todayHours + leg.hours > maxHoursPerDay;
    const stoppedOnPass = today.length > 0 && today[today.length - 1].endsOnPass;

    if (today.length > 0 && wouldPassLimit && !stoppedOnPass) {
      days.push(today); // end the day here and start a new one
      today = [];
      todayHours = 0;
    }
    today.push(leg);
    todayHours += leg.hours;
  }
  if (today.length > 0) days.push(today);
  return days;
}

/** Picks the stay tier from the budget per person per day (no budget -> simple). */
export function pickStayTier(budgetPerPerson, totalDays) {
  if (!budgetPerPerson) return STAY_TIERS[0];
  const budgetPerDay = budgetPerPerson / totalDays;
  return STAY_TIERS.find((tier) => budgetPerDay < tier.maxBudgetPerDay);
}


export function estimateCost({ legs, totalDays, localDays, travellers, budgetPerPerson, transportMode }) {
  const transport =
    transportMode === "private"
      ? (sum(legs, (leg) => leg.km * (leg.fares.privateTaxiPerKm ?? PRIVATE_FARE_PER_KM)) +
          localDays * LOCAL_DAY_VEHICLE_COST) /
        travellers
      : sum(legs, (leg) => leg.fares.sharedTaxi ?? leg.km * SHARED_FARE_PER_KM);

  const tier = pickStayTier(budgetPerPerson, totalDays);
  const nights = totalDays - 1;
  const rooms = Math.ceil(travellers / PEOPLE_PER_ROOM);
  const stay = (nights * tier.ratePerRoom * rooms) / travellers;

  const food = FOOD_PER_DAY * totalDays;
  const total = roundRupees(transport) + roundRupees(stay) + roundRupees(food);

  return {
    transport: roundRupees(transport),
    stay: roundRupees(stay),
    food: roundRupees(food),
    total,
    tier: tier.name,
    ratePerRoom: tier.ratePerRoom,
    rooms,
    nights,
    // positive = under budget by this much, negative = over budget
    budgetDifference: budgetPerPerson ? budgetPerPerson - total : null
  };
}

/**
 * Builds the full day-by-day plan.
 *
 * @param routes  Route documents (fromId, toId, roadKm, hillHours, factors, isPass, fares)
 * @param places  Destination documents (_id, name, slug, altitudeM, isPass, attractions, extraPermitNote)
 * @returns { orderedDestinations, days, warnings, totalKm, cost, minimumDays }
 */
export function buildPlan({
  routes,
  places,
  startId,
  destinationIds,
  days,
  travellers = 1,
  month,
  budgetPerPerson,
  transportMode = "shared"
}) {
  const placeById = new Map(places.map((p) => [key(p._id), p]));
  const place = (id) => {
    const found = placeById.get(key(id));
    if (!found) throw ApiError.badRequest(`Unknown place: ${id}`);
    return found;
  };

  const graph = buildGraph(routes);
  const start = key(place(startId)._id);
  const destinations = [...new Set(destinationIds.map(key))].filter((id) => id !== start);
  if (destinations.length === 0) {
    throw ApiError.badRequest("Choose at least one destination that is not your start city");
  }

  const findPath = (fromId, toId) => {
    const path = shortestPath(graph, fromId, toId);
    if (!path) {
      throw ApiError.badRequest(`No road route found between ${place(fromId).name} and ${place(toId).name}`);
    }
    return path;
  };

  // 1. Visit the nearest destination first (by hill hours from the start)
  const ordered = destinations
    .map((id) => ({ id, hoursFromStart: findPath(start, id).hours }))
    .sort((a, b) => a.hoursFromStart - b.hoursFromStart);

  // 2. Drive days: start -> each destination in order -> back to start
  const stops = [start, ...ordered.map((d) => d.id), start];
  const driveDays = []; // { legs, arrivedAt }  arrivedAt = destination id reached at the end, if any
  for (let i = 0; i < stops.length - 1; i++) {
    const legs = findPath(stops[i], stops[i + 1]).legs.map((leg) => ({
      ...leg,
      hours: applySeason(leg.hours, leg, month),
      endsOnPass: Boolean(place(leg.toId).isPass)
    }));
    const groups = splitIntoDriveDays(legs);
    const isReturnJourney = i === stops.length - 2;
    groups.forEach((group, g) => {
      const isLastGroup = g === groups.length - 1;
      driveDays.push({ legs: group, arrivedAt: isLastGroup && !isReturnJourney ? stops[i + 1] : null });
    });
  }
  const minimumDays = driveDays.length;

  // 3. Spare days become local sightseeing days, shared round-robin starting
  //    with the farthest destination (where travellers most want time)
  const spareDays = Math.max(0, days - minimumDays);
  const localDaysAt = new Map(); // destination id -> number of local days
  const farthestFirst = [...ordered].reverse();
  for (let k = 0; k < spareDays; k++) {
    const id = farthestFirst[k % farthestFirst.length].id;
    localDaysAt.set(id, (localDaysAt.get(id) ?? 0) + 1);
  }

  // 4. Put the days in order; local days go right after arriving at that destination
  const planDays = []; // internal: each day also keeps its end place and legs
  for (const driveDay of driveDays) {
    const { legs } = driveDay;
    const from = place(legs[0].fromId);
    const end = place(legs[legs.length - 1].toId);
    planDays.push({
      type: "drive",
      fromName: from.name,
      toName: end.name,
      via: legs.slice(0, -1).map((leg) => place(leg.toId).name),
      km: sum(legs, (leg) => leg.km),
      hours: roundHours(sum(legs, (leg) => leg.hours)),
      sights: [],
      end,
      legs
    });

    const localCount = driveDay.arrivedAt ? (localDaysAt.get(driveDay.arrivedAt) ?? 0) : 0;
    for (let k = 0; k < localCount; k++) {
      // Spread the attractions over the local days at this place
      const sights = (end.attractions ?? [])
        .filter((_, index) => index % localCount === k)
        .map((a) => a.name);
      planDays.push({
        type: "local",
        fromName: end.name,
        toName: end.name,
        via: [],
        km: 0,
        hours: 0,
        sights: sights.length > 0 ? sights : ["Rest day: short walks around town"],
        end,
        legs: []
      });
    }
  }

  // 5. Number the days and add where to sleep (every night except after the last day)
  planDays.forEach((day, index) => {
    day.dayNumber = index + 1;
    if (index < planDays.length - 1) {
      day.stayName = day.end.name;
      day.stayAltitudeM = day.end.altitudeM;
    }
  });

  // 6. Warnings
  const warnings = [];
  if (days < minimumDays) {
    warnings.push({
      level: "warn",
      text: `This route needs at least ${minimumDays} days. The plan below shows the minimum.`
    });
  }
  if (MONSOON_MONTHS.includes(month)) {
    warnings.push({
      level: "warn",
      text: "June to September is monsoon: landslides can slow or block hill roads. Drive times include extra time; keep a spare day."
    });
  }
  for (const day of planDays.filter((d) => d.type === "drive")) {
    if (day.hours > LONG_DRIVE_HOURS) {
      warnings.push({
        level: "warn",
        text: `Day ${day.dayNumber} is a long drive (about ${day.hours} h on hill roads). Leave by 6 am to arrive before dark.`
      });
    }
    if (WINTER_MONTHS.includes(month)) {
      const passes = new Set(
        day.legs.flatMap((leg) => [leg.fromId, leg.toId]).filter((id) => place(id).isPass)
      );
      for (const passId of passes) {
        const pass = place(passId);
        warnings.push({
          level: "warn",
          text: `Day ${day.dayNumber} crosses ${pass.name} (${pass.altitudeM.toLocaleString("en-IN")} m): snow and ice are common from December to March and the road can close. Keep a spare day and check road conditions locally.`
        });
      }
    }
  }
  const firstHighNight = planDays.find((d) => d.stayAltitudeM > HIGH_ALTITUDE_M);
  if (firstHighNight) {
    warnings.push({
      level: "warn",
      text: `Your first night above 2,800 m is in ${firstHighNight.stayName} (${firstHighNight.stayAltitudeM.toLocaleString("en-IN")} m) on Day ${firstHighNight.dayNumber}. Climb slowly, drink plenty of water and rest on arrival.`
    });
  }
  for (const { id } of ordered) {
    const destination = place(id);
    if (destination.extraPermitNote) {
      warnings.push({ level: "info", text: `${destination.name}: ${destination.extraPermitNote}` });
    }
  }

  // 7. Totals and cost
  const allLegs = planDays.flatMap((d) => d.legs);
  const totalKm = sum(allLegs, (leg) => leg.km);
  const cost = estimateCost({
    legs: allLegs,
    totalDays: planDays.length,
    localDays: planDays.filter((d) => d.type === "local").length,
    travellers,
    budgetPerPerson,
    transportMode
  });

  return {
    orderedDestinations: ordered.map(({ id, hoursFromStart }) => ({
      id,
      name: place(id).name,
      slug: place(id).slug,
      hoursFromStart: roundHours(hoursFromStart)
    })),
    // Remove the internal helper fields before returning
    days: planDays.map(({ end: _end, legs: _legs, ...day }) => day),
    warnings,
    totalKm,
    cost,
    minimumDays
  };
}
