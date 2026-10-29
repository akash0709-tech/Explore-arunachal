// Fills the database with SAMPLE data for the demo.
//
//   npm run seed           -> inserts everything (stops if sample data already exists)
//   npm run seed:fresh     -> deletes the old sample data first, then inserts it again
//
// What --fresh deletes: all destinations, permit rules and routes (reference data),
// plus only the SAMPLE homestays and the SAMPLE user accounts. Real sign-ups stay.
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../utils/logger.js";
import { User, Destination, PermitRule, Route, Homestay } from "../models/index.js";

import { users } from "./data/users.js";
import { permitRules } from "./data/permitRules.js";
import { destinations } from "./data/destinations.js";
import { routes } from "./data/routes.js";
import { homestays, LICENCE_AUTHORITY } from "./data/homestays.js";

const FRESH = process.argv.includes("--fresh");
const seedEmails = users.map((u) => u.email);

function checkSeedPassword() {
  const password = env.seedPassword;
  if (!password || password.length < 8 || !/\d/.test(password)) {
    logger.error("Set SEED_PASSWORD in server/.env (at least 8 characters with a number), then run again.");
    process.exit(1);
  }
  return password;
}

async function clearSampleData() {
  logger.info("--fresh: removing old sample data...");
  await Promise.all([
    Destination.deleteMany({}),
    PermitRule.deleteMany({}),
    Route.deleteMany({}),
    Homestay.deleteMany({ isSample: true }),
    User.deleteMany({ email: { $in: seedEmails } })
  ]);
}

// 1. Users (admin, hosts, traveller), all with SEED_PASSWORD
async function seedUsers(password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const docs = await User.insertMany(
    users.map((u) => ({ ...u, passwordHash, emailVerified: true, phoneVerified: true }))
  );
  return new Map(docs.map((d) => [d.email, d])); // email -> user
}

// 2. Permit rules, marked as verified today by the admin
async function seedPermitRules(admin) {
  const now = new Date();
  return PermitRule.insertMany(
    permitRules.map((rule) => ({ ...rule, lastVerifiedAt: now, verifiedBy: admin._id }))
  );
}

// 3. Destinations, linked to the rules that apply to them
async function seedDestinations(rules) {
  const mainRuleIds = rules.filter((r) => r.code !== "EXTRA").map((r) => r._id); // ILP + PAP
  const extraRules = rules.filter((r) => r.code === "EXTRA");

  const docs = await Destination.insertMany(
    destinations.map(({ inArunachal, ...place }) => {
      const extraIds = extraRules.filter((r) => r.areaScope.includes(place.slug)).map((r) => r._id);
      return {
        ...place,
        permitRuleIds: inArunachal ? [...mainRuleIds, ...extraIds] : extraIds,
        isSample: true
      };
    })
  );
  return new Map(docs.map((d) => [d.slug, d])); // slug -> destination
}

// 4. Road segments between destinations
async function seedRoutes(placesBySlug) {
  const place = (slug) => {
    const found = placesBySlug.get(slug);
    if (!found) throw new Error(`Route refers to unknown destination "${slug}"`);
    return found;
  };
  return Route.insertMany(
    routes.map(({ from, to, ...segment }) => ({
      ...segment,
      fromId: place(from)._id,
      toId: place(to)._id,
      from: place(from).name,
      to: place(to).name,
      isSample: true
    }))
  );
}

// 5. Homestays, linked to their host and town
async function seedHomestays(usersByEmail, placesBySlug) {
  const now = Date.now();
  const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000);

  return Homestay.insertMany(
    homestays.map(({ hostEmail, town, licence, status, ...stay }, index) => {
      const isLive = status === "live";
      return {
        ...stay,
        hostId: usersByEmail.get(hostEmail)._id,
        town: placesBySlug.get(town)._id,
        checkIn: "12:00",
        checkOut: "10:00",
        photos: [],
        approval: {
          type: "required",
          licenceNumber: licence,
          authority: LICENCE_AUTHORITY,
          validUntil: new Date("2027-03-31")
        },
        declarations: { truthful: true, notGovtCertified: true },
        status,
        currentStep: 6,
        submittedAt: daysAgo(isLive ? 30 - index : 3 - (index % 3)),
        approvedAt: isLive ? daysAgo(25 - index) : undefined,
        stats: isLive ? { views: 40 + index * 17, contactTaps: 3 + index } : { views: 0, contactTaps: 0 },
        isSample: true
      };
    })
  );
}

async function run() {
  const password = checkSeedPassword();
  await connectDB();

  if (FRESH) {
    await clearSampleData();
  } else if (await Destination.exists({})) {
    logger.error("Sample data already exists. Use `npm run seed:fresh` to replace it.");
    await disconnectDB();
    process.exit(1);
  }

  const usersByEmail = await seedUsers(password);
  const rules = await seedPermitRules(usersByEmail.get("admin@explorearunachal.test"));
  const placesBySlug = await seedDestinations(rules);
  const segments = await seedRoutes(placesBySlug);
  const stays = await seedHomestays(usersByEmail, placesBySlug);

  const live = stays.filter((s) => s.status === "live").length;
  console.log("\n✅ Seed complete (all records are SAMPLE data)");
  console.table({
    users: { inserted: usersByEmail.size },
    permitRules: { inserted: rules.length },
    destinations: { inserted: placesBySlug.size },
    routes: { inserted: segments.length },
    homestays: { inserted: stays.length, live, pending: stays.length - live }
  });
  console.log("Sample logins (password = SEED_PASSWORD):");
  users.forEach((u) => console.log(`  ${u.role.padEnd(9)} ${u.email}`));
  console.log("");

  await disconnectDB();
}

run().catch(async (err) => {
  logger.error(`Seed failed: ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
