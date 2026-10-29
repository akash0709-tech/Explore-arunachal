// "What is still missing?" for a homestay listing, step by step.
//
// One pure function used in three places, so the rules never disagree:
//   - saving a wizard step (is THIS step complete?)
//   - submitting for review (are ALL steps complete?)
//   - the host's view of a draft (show what is left to do)
import { MIN_HOMESTAY_PHOTOS, REVIEW_CHECKLIST_ITEMS } from "../utils/constants.js";

const missing = (step, field, message) => ({ step, field, message });
const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";
const hasDocument = (homestay, slot) => (homestay.documents ?? []).some((d) => d.slot === slot);

const STEP_CHECKS = {
  // 1 Basics
  1: (h) =>
    [
      isBlank(h.name) && missing(1, "name", "Homestay name is required"),
      isBlank(h.ownerName) && missing(1, "ownerName", "Owner name is required"),
      isBlank(h.phone) && missing(1, "phone", "Phone number is required"),
      !h.town && missing(1, "town", "Choose the town"),
      !h.approxLocation?.coordinates && missing(1, "approxLocation", "Drop a pin on the map")
    ].filter(Boolean),

  // 2 Photos (uploaded through /api/uploads)
  2: (h) => {
    const count = h.photos?.length ?? 0;
    return count < MIN_HOMESTAY_PHOTOS
      ? [missing(2, "photos", `Add at least ${MIN_HOMESTAY_PHOTOS} photos (you have ${count})`)]
      : [];
  },

  // 3 Rooms and prices
  3: (h) =>
    [
      !h.rooms && missing(3, "rooms", "Number of rooms is required"),
      !h.maxGuests && missing(3, "maxGuests", "Maximum guests is required"),
      !(h.pricePerNight > 0) && missing(3, "pricePerNight", "Price per night is required")
    ].filter(Boolean),

  // 4 Tourism approval
  4: (h) => {
    const approval = h.approval ?? {};
    if (!approval.type) return [missing(4, "approval.type", "Say whether a tourism licence applies")];
    if (approval.type === "not_applicable") {
      return isBlank(approval.naReason)
        ? [missing(4, "approval.naReason", "Explain why no licence is needed")]
        : [];
    }
    return [
      isBlank(approval.licenceNumber) && missing(4, "approval.licenceNumber", "Licence number is required"),
      !hasDocument(h, "certificate") && missing(4, "documents.certificate", "Upload the licence certificate")
    ].filter(Boolean);
  },

  // 5 Proof of address and ID (private documents)
  5: (h) => {
    const proof = (h.documents ?? []).find((d) => d.slot === "proof");
    const id = (h.documents ?? []).find((d) => d.slot === "id");
    return [
      !proof && missing(5, "documents.proof", "Upload a proof of address"),
      proof && isBlank(proof.proofType) && missing(5, "proofType", "Say what kind of proof this is"),
      !id && missing(5, "documents.id", "Upload a photo ID"),
      id && isBlank(id.idType) && missing(5, "idType", "Say what kind of ID this is")
    ].filter(Boolean);
  },

  // 6 Review: nothing to fill in
  6: () => []
};

/** Missing items for one step. The homestay must be loaded with +documents for steps 4 and 5. */
export const missingForStep = (homestay, step) => STEP_CHECKS[step](homestay);

/** Missing items for the whole listing, in step order. */
export const missingForListing = (homestay) =>
  [1, 2, 3, 4, 5, 6].flatMap((step) => missingForStep(homestay, step));

/**
 * Server-side check of the admin's review checklist before APPROVING a listing.
 * checklist = { certificate, proof, id, namesMatch, photosMatch }, each "valid" | "invalid" | "not_applicable".
 * Every item must be "valid". The only exception: the certificate may be "not_applicable"
 * when the host said no tourism licence applies. Returns a list of problems (empty = OK).
 */
export function checklistProblems(homestay, checklist = {}) {
  const licenceNotNeeded = homestay.approval?.type === "not_applicable";
  const problems = [];

  for (const item of REVIEW_CHECKLIST_ITEMS) {
    const value = checklist[item];
    const allowed = item === "certificate" && licenceNotNeeded ? ["valid", "not_applicable"] : ["valid"];
    if (!allowed.includes(value)) {
      problems.push({
        field: `checklist.${item}`,
        message: `${item} is "${value ?? "not checked"}"; it must be valid to approve`
      });
    }
  }

  // The listing itself must also be complete (documents really uploaded, etc.)
  for (const { field, message } of missingForListing(homestay)) problems.push({ field, message });
  return problems;
}
