// Road network used by the trip planner and the route map.
import { Route, Destination } from "../models/index.js";

// Returns the whole network in one response (it is small: a few dozen segments),
// so it is not paginated. nodes = places with coordinates, segments = roads between them.
export async function getRouteGraph() {
  const [segments, nodes] = await Promise.all([
    Route.find()
      .select("fromId toId from to roadKm hillHours monsoonFactor winterFactor isPass fares isSample")
      .lean(),
    Destination.find().select("name slug altitudeM location isWaypoint isPass isStartCity").sort({ name: 1 }).lean()
  ]);
  return { nodes, segments };
}
