// Unit tests for the trip planner. No database: we use the seed data files
// directly, with each place's slug as its id (e.g. "tawang").
import {
  buildGraph,
  shortestPath,
  splitIntoDriveDays,
  applySeason,
  pickStayTier,
  buildPlan
} from "../src/services/planner.service.js";
import { destinations } from "../src/seed/data/destinations.js";
import { routes as seedRoutes } from "../src/seed/data/routes.js";

const places = destinations.map((d) => ({ ...d, _id: d.slug }));
const routes = seedRoutes.map((r) => ({ ...r, fromId: r.from, toId: r.to }));

const OCTOBER = 10; // no seasonal slowdown
const DECEMBER = 12;
const JULY = 7;

const plan = (overrides) =>
  buildPlan({
    routes,
    places,
    startId: "guwahati",
    destinationIds: ["tawang", "dirang"], // deliberately not in travel order
    days: 5,
    travellers: 2,
    month: OCTOBER,
    transportMode: "shared",
    ...overrides
  });

describe("shortestPath", () => {
  const graph = buildGraph(routes);

  it("finds the road from Guwahati to Tawang through every stop", () => {
    const path = shortestPath(graph, "guwahati", "tawang");
    expect(path.legs.map((l) => l.toId)).toEqual(["bhalukpong", "bomdila", "dirang", "sela-pass", "tawang"]);
    expect(path.hours).toBe(16.75);
    expect(path.km).toBe(507);
  });

  it("works in the reverse direction", () => {
    expect(shortestPath(graph, "tawang", "guwahati").hours).toBe(16.75);
  });

  it("returns null when no road connects two places", () => {
    const g = buildGraph([{ fromId: "a", toId: "b", hillHours: 1, roadKm: 10 }]);
    expect(shortestPath(g, "a", "z")).toBeNull();
  });
});

describe("applySeason", () => {
  const road = { isPass: false, monsoonFactor: 1.25, winterFactor: 1.4 };
  const pass = { ...road, isPass: true };

  it("slows every road in the monsoon", () => expect(applySeason(4, road, JULY)).toBe(5));
  it("slows only pass roads in winter", () => {
    expect(applySeason(2.5, pass, DECEMBER)).toBe(3.5);
    expect(applySeason(4, road, DECEMBER)).toBe(4);
  });
  it("changes nothing in October", () => expect(applySeason(4, pass, OCTOBER)).toBe(4));
});

describe("splitIntoDriveDays", () => {
  it("fills a day up to the limit, then starts a new one", () => {
    const legs = [{ hours: 5.5 }, { hours: 4 }, { hours: 1.75 }];
    expect(splitIntoDriveDays(legs).map((d) => d.length)).toEqual([2, 1]);
  });

  it("never ends a day on a mountain pass", () => {
    const legs = [{ hours: 5 }, { hours: 3, endsOnPass: true }, { hours: 3 }];
    // 5 + 3 = 8, adding 3 would pass 9.5, but we are on a pass, so keep going
    expect(splitIntoDriveDays(legs).map((d) => d.length)).toEqual([3]);
  });
});

describe("buildPlan: Guwahati -> Dirang + Tawang", () => {
  it("orders destinations nearest first", () => {
    expect(plan().orderedDestinations.map((d) => d.slug)).toEqual(["dirang", "tawang"]);
  });

  it("plans 5 days: 3 days in, then the return", () => {
    const { days, minimumDays, warnings } = plan();
    expect(minimumDays).toBe(5);
    expect(days).toHaveLength(5);

    expect(days[0]).toMatchObject({
      type: "drive",
      fromName: "Guwahati",
      toName: "Bomdila",
      via: ["Bhalukpong"],
      hours: 9.5
    });
    expect(days[1]).toMatchObject({ type: "drive", fromName: "Bomdila", toName: "Dirang" });
    expect(days[2]).toMatchObject({
      type: "drive",
      fromName: "Dirang",
      toName: "Tawang",
      via: ["Sela Pass"]
    });
    expect(days[3]).toMatchObject({ type: "drive", fromName: "Tawang", toName: "Bomdila" });
    expect(days[4]).toMatchObject({ type: "drive", fromName: "Bomdila", toName: "Guwahati" });

    // the return day crosses Sela Pass and does not stop there
    expect(days[3].via).toEqual(["Sela Pass", "Dirang"]);
    expect(warnings.some((w) => /needs at least/.test(w.text))).toBe(false);
  });

  it("sleeps at the end town of every day except the last", () => {
    const { days } = plan();
    expect(days.slice(0, -1).map((d) => d.stayName)).toEqual(["Bomdila", "Dirang", "Tawang", "Bomdila"]);
    expect(days.at(-1).stayName).toBeUndefined();
  });

  it("adds local days round-robin, farthest destination first", () => {
    const { days } = plan({ days: 8 }); // 3 spare days
    expect(days.map((d) => `${d.type}:${d.toName}`)).toEqual([
      "drive:Bomdila",
      "drive:Dirang",
      "local:Dirang",
      "drive:Tawang",
      "local:Tawang",
      "local:Tawang",
      "drive:Bomdila",
      "drive:Guwahati"
    ]);
    // the two Tawang local days share the attractions between them
    const tawangSights = days
      .filter((d) => d.type === "local" && d.toName === "Tawang")
      .flatMap((d) => d.sights);
    expect(tawangSights).toHaveLength(3);
  });

  it("warns when there are not enough days and still returns the minimum plan", () => {
    const { days, warnings } = plan({ days: 3 });
    expect(days).toHaveLength(5);
    expect(warnings[0]).toEqual({ level: "warn", text: expect.stringContaining("needs at least 5 days") });
  });

  it("adds the Sela Pass snow warning in December and slows the pass", () => {
    const { days, warnings } = plan({ month: DECEMBER });
    const snow = warnings.filter((w) => /Sela Pass .*snow/.test(w.text));
    expect(snow.length).toBeGreaterThanOrEqual(1);
    expect(days[2].hours).toBe(7.75); // 5.5 h x 1.4 = 7.7, rounded to the quarter hour
  });

  it("has no snow warning in October", () => {
    expect(plan().warnings.some((w) => /snow/.test(w.text))).toBe(false);
  });

  it("splits the first day earlier in the monsoon", () => {
    const { days, warnings } = plan({ month: JULY });
    expect(days[0].toName).toBe("Bhalukpong");
    expect(warnings.some((w) => /monsoon/.test(w.text))).toBe(true);
  });

  it("warns about long drives, the first high-altitude night and the Tawang permit", () => {
    const texts = plan()
      .warnings.map((w) => w.text)
      .join("\n");
    expect(texts).toMatch(/Day 1 is a long drive/);
    expect(texts).toMatch(/first night above 2,800 m is in Tawang \(3,048 m\) on Day 3/);
    expect(texts).toMatch(/Tawang: Bum La and Sangetsar Lake/);
  });
});

describe("costs (per person)", () => {
  it("shared taxi for 2 travellers, simple stays", () => {
    const { cost, totalKm } = plan();
    expect(totalKm).toBe(1014); // 507 km each way
    expect(cost.tier).toBe("simple");
    expect(cost.transport).toBe(3240); // sum of shared-taxi fares, rounded to Rs 10
    expect(cost.stay).toBe(2600); //      4 nights x 1300 x 1 room / 2 people
    expect(cost.food).toBe(2750); //      5 days x 550
    expect(cost.total).toBe(3240 + 2600 + 2750);
  });

  it("private car is split between travellers and charges local days", () => {
    const { cost } = plan({ transportMode: "private", travellers: 4, days: 6 });
    // (1014 km x 28 + 1 local day x 1500) / 4 people = 7473.5 -> 7470
    expect(cost.transport).toBe(7470);
  });

  it("picks the stay tier from the budget per day and reports the difference", () => {
    expect(pickStayTier(15000, 5).name).toBe("comfortable"); // 3000/day
    expect(pickStayTier(25000, 5).name).toBe("premium"); //     5000/day
    const { cost } = plan({ budgetPerPerson: 15000 });
    expect(cost.tier).toBe("comfortable");
    expect(cost.budgetDifference).toBe(15000 - cost.total);
  });
});

describe("input errors", () => {
  it("rejects a trip whose only destination is the start city", () => {
    expect(() => plan({ destinationIds: ["guwahati"] })).toThrow(/not your start city/);
  });
  it("rejects unknown places", () => {
    expect(() => plan({ destinationIds: ["goa"] })).toThrow(/Unknown place/);
  });
});
