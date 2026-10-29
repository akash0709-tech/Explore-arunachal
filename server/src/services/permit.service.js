// Permit Wizard logic: which permits does this traveller need for these places?
// The answer comes entirely from the database (PermitRule + Destination.permitRuleIds),
// so admins can update rules without changing code. We never issue permits.
import { Destination, PermitRule } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

// Fields of a permit rule that travellers may see (verifiedBy stays internal)
export const PUBLIC_PERMIT_FIELDS =
  "code appliesTo title whoNeedsIt documents steps officialUrl officialLabel areaScope lastVerifiedAt notes";

export const PERMIT_DISCLAIMER =
  "Estimates only. Explore Arunachal does not issue ILP or PAP. Always confirm the current rules on the official portal before you travel.";

export async function checkPermits({ citizen, destinations: slugs }) {
  // 1. Load the chosen places and make sure every slug exists
  const places = await Destination.find({ slug: { $in: slugs } })
    .select("name slug permitRuleIds")
    .lean();

  const missing = slugs.filter((slug) => !places.some((p) => p.slug === slug));
  if (missing.length > 0) {
    throw ApiError.notFound(
      `Unknown destination: ${missing.join(", ")}`,
      missing.map((slug) => ({ field: "destinations", message: `"${slug}" was not found` }))
    );
  }

  // 2. Rules linked to those places, plus extra rules whose areaScope mentions them,
  //    keeping only the ones for this traveller ("indian" / "foreign") or for everyone
  const linkedRuleIds = places.flatMap((p) => p.permitRuleIds);
  const rules = await PermitRule.find({
    $or: [{ _id: { $in: linkedRuleIds } }, { code: "EXTRA", areaScope: { $in: slugs } }],
    appliesTo: { $in: [citizen, "all"] }
  })
    .select(PUBLIC_PERMIT_FIELDS)
    .lean();

  // 3. ILP (Indian) or PAP (foreign). null when no place is inside Arunachal (e.g. only Guwahati).
  const mainPermit = rules.find((r) => r.code !== "EXTRA") ?? null;

  // 4. Extra local permissions, with the chosen places they apply to
  const extraRules = rules
    .filter((r) => r.code === "EXTRA")
    .map((r) => ({ ...r, forDestinations: r.areaScope.filter((slug) => slugs.includes(slug)) }));

  // Keep the order the traveller chose
  const orderedPlaces = slugs.map((slug) => {
    const { name } = places.find((p) => p.slug === slug);
    return { slug, name };
  });

  return {
    citizen,
    destinations: orderedPlaces,
    mainPermit,
    extraRules,
    disclaimer: PERMIT_DISCLAIMER
  };
}
