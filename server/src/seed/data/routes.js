// SAMPLE DATA. Road segments with HILL-ADJUSTED drive hours (realistic for mountain
// roads, slower than map apps suggest). One direction is stored; the planner also
// uses each segment in reverse.
//
// Indicative fares:
//   shared taxi: about Rs 3.2 per km per person
//   private car: about Rs 28 per km per vehicle

const SHARED_TAXI_PER_KM = 3.2;
const PRIVATE_CAR_PER_KM = 28;

const segment = (from, to, roadKm, hillHours, extra = {}) => ({
  from, // destination slugs; seed.js turns them into ids and names
  to,
  roadKm,
  hillHours,
  fares: {
    sharedTaxi: Math.round(roadKm * SHARED_TAXI_PER_KM),
    privateTaxiPerKm: PRIVATE_CAR_PER_KM
  },
  ...extra
});

export const routes = [
  // Tawang road (via Bhalukpong, Bomdila, Dirang and Sela Pass)
  segment("guwahati", "bhalukpong", 225, 5.5),
  segment("bhalukpong", "bomdila", 100, 4),
  segment("bomdila", "dirang", 42, 1.75),
  segment("dirang", "sela-pass", 70, 2.75, { isPass: true }),
  segment("sela-pass", "tawang", 70, 2.75, { isPass: true }),

  // Central Arunachal
  segment("guwahati", "itanagar", 330, 7.5),
  segment("itanagar", "ziro", 115, 4)
];
