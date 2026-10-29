// Unit tests for the "what is still missing" rules used by the host wizard and submit.
import {
  missingForStep,
  missingForListing,
  checklistProblems
} from "../src/services/listingChecks.service.js";

const complete = {
  name: "Sangti Riverside Homestay",
  ownerName: "Pema Dorjee",
  phone: "9000000101",
  town: "town-id",
  approxLocation: { type: "Point", coordinates: [92.2, 27.37] },
  photos: [{}, {}, {}],
  rooms: 3,
  maxGuests: 8,
  pricePerNight: 1800,
  approval: { type: "required", licenceNumber: "WK-0101" },
  documents: [
    { slot: "certificate" },
    { slot: "proof", proofType: "Electricity bill" },
    { slot: "id", idType: "Aadhaar" }
  ]
};
const fields = (list) => list.map((m) => m.field);

describe("listing checks", () => {
  it("a complete listing has nothing missing", () => {
    expect(missingForListing(complete)).toEqual([]);
  });

  it("an empty draft lists items from every step", () => {
    const steps = new Set(missingForListing({}).map((m) => m.step));
    expect([...steps]).toEqual([1, 2, 3, 4, 5]);
  });

  it("needs at least 3 photos", () => {
    expect(missingForStep({ ...complete, photos: [{}, {}] }, 2)[0].message).toMatch(
      /at least 3 photos \(you have 2\)/
    );
  });

  it("licence required -> needs a number and the certificate file", () => {
    const h = { ...complete, approval: { type: "required" }, documents: [] };
    expect(fields(missingForStep(h, 4))).toEqual(["approval.licenceNumber", "documents.certificate"]);
  });

  it("licence not applicable -> needs only a reason", () => {
    const h = { ...complete, approval: { type: "not_applicable" }, documents: [] };
    expect(fields(missingForStep(h, 4))).toEqual(["approval.naReason"]);
    expect(
      missingForStep({ ...h, approval: { type: "not_applicable", naReason: "Fewer than 3 rooms" } }, 4)
    ).toEqual([]);
  });

  it("proof and ID need their files and their types", () => {
    const h = { ...complete, documents: [{ slot: "proof" }] };
    expect(fields(missingForStep(h, 5))).toEqual(["proofType", "documents.id"]);
  });

  it("price must be more than zero", () => {
    expect(fields(missingForStep({ ...complete, pricePerNight: 0 }, 3))).toEqual(["pricePerNight"]);
  });
});

describe("approval checklist (server-side)", () => {
  const allValid = {
    certificate: "valid",
    proof: "valid",
    id: "valid",
    namesMatch: "valid",
    photosMatch: "valid"
  };

  it("approves only when every item is valid", () => {
    expect(checklistProblems(complete, allValid)).toEqual([]);
  });

  it("refuses an invalid or unchecked item", () => {
    const problems = checklistProblems(complete, {
      ...allValid,
      namesMatch: "invalid",
      photosMatch: undefined
    });
    expect(problems.map((p) => p.field)).toEqual(["checklist.namesMatch", "checklist.photosMatch"]);
  });

  it("allows a not_applicable certificate only when no licence applies", () => {
    const checklist = { ...allValid, certificate: "not_applicable" };
    expect(checklistProblems(complete, checklist).map((p) => p.field)).toEqual(["checklist.certificate"]);
    const noLicence = { ...complete, approval: { type: "not_applicable", naReason: "Fewer than 3 rooms" } };
    expect(checklistProblems(noLicence, checklist)).toEqual([]);
  });

  it("refuses a listing whose documents are missing, even with a valid checklist", () => {
    const fields = checklistProblems({ ...complete, documents: [] }, allValid).map((p) => p.field);
    expect(fields).toEqual(
      expect.arrayContaining(["documents.certificate", "documents.proof", "documents.id"])
    );
  });
});
