// Small helpers over the road network from GET /api/routes/graph, for DISPLAY only
// (drive time on a destination card, the elevation profile). Real trip planning,
// with seasons and day splitting, always happens on the server.

/**
 * Fewest hill hours from one place to another (Dijkstra). Roads work both ways.
 * @returns {{ ids: string[], hours: number, km: number, legs: object[] } | null}
 */
export function shortestRoute(graph, fromId, toId) {
  if (!graph) return null;
  const neighbours = new Map();
  for (const segment of graph.segments) {
    const add = (a, b) => {
      if (!neighbours.has(a)) neighbours.set(a, []);
      neighbours.get(a).push({ to: b, segment });
    };
    add(segment.fromId, segment.toId);
    add(segment.toId, segment.fromId);
  }

  const best = new Map([[fromId, 0]]);
  const cameFrom = new Map();
  const queue = [{ id: fromId, hours: 0 }];
  const done = new Set();
  while (queue.length > 0) {
    queue.sort((a, b) => a.hours - b.hours);
    const { id, hours } = queue.shift();
    if (done.has(id)) continue;
    done.add(id);
    if (id === toId) break;
    for (const { to, segment } of neighbours.get(id) ?? []) {
      const next = hours + segment.hillHours;
      if (next < (best.get(to) ?? Infinity)) {
        best.set(to, next);
        cameFrom.set(to, { from: id, segment });
        queue.push({ id: to, hours: next });
      }
    }
  }
  if (!best.has(toId)) return null;

  const ids = [toId];
  const legs = [];
  for (let id = toId; id !== fromId;) {
    const step = cameFrom.get(id);
    legs.unshift(step.segment);
    ids.unshift(step.from);
    id = step.from;
  }
  return { ids, legs, hours: best.get(toId), km: legs.reduce((sum, leg) => sum + leg.roadKm, 0) };
}

/**
 * Points for the elevation profile: each place on the route with its cumulative km.
 * @returns {{ name: string, km: number, altitudeM: number, isPass: boolean }[]}
 */
export function profilePoints(graph, fromSlug, toSlug) {
  if (!graph) return [];
  const bySlug = new Map(graph.nodes.map((n) => [n.slug, n]));
  const byId = new Map(graph.nodes.map((n) => [n._id, n]));
  const from = bySlug.get(fromSlug);
  const to = bySlug.get(toSlug);
  const route = from && to ? shortestRoute(graph, from._id, to._id) : null;
  if (!route) return [];

  let km = 0;
  return route.ids.map((id, index) => {
    if (index > 0) km += route.legs[index - 1].roadKm;
    const node = byId.get(id);
    return { name: node.name, km, altitudeM: node.altitudeM, isPass: Boolean(node.isPass) };
  });
}
