// SAMPLE DATA. Permit rules shown by the Permit Wizard.
// IMPORTANT: re-check these against the official sources on the hackathon day,
// then mark them verified from the admin panel. We never issue permits.
// lastVerifiedAt is set to the seed date by seed.js.

export const permitRules = [
  {
    code: "ILP",
    appliesTo: "indian",
    title: "Inner Line Permit (ILP)",
    whoNeedsIt: "Indian citizens from outside Arunachal Pradesh, for every visit, including tourists.",
    documents: [
      "Recent digital passport-size photo",
      "Government photo ID such as Aadhaar, Voter ID, Passport or Driving Licence",
      "Travel dates and the places you will visit",
      "Printed or downloaded e-ILP to show at checkpoints"
    ],
    steps: [
      "Apply on the official e-ILP portal.",
      "Upload your photo and ID, and enter your travel dates and places.",
      "Pay the fee online and download your e-ILP.",
      "Show it at the entry checkpoint, such as Bhalukpong or Banderdewa."
    ],
    officialUrl: "https://www.eilp.arunachal.gov.in",
    officialLabel: "Apply on the official e-ILP portal",
    notes: "Fees, validity and the list of documents can change. Always check the portal before you travel."
  },
  {
    code: "PAP",
    appliesTo: "foreign",
    title: "Protected Area Permit (PAP)",
    whoNeedsIt: "Foreign nationals visiting any part of Arunachal Pradesh.",
    documents: [
      "Passport and valid Indian visa",
      "Recent passport-size photo",
      "Planned itinerary (places and dates)",
      "Printed copies of the permit to carry during the trip"
    ],
    steps: [
      "Check the current PAP rules on official government sources.",
      "Apply through the official channel or a registered tour operator, as the rules require.",
      "Carry printed copies of the permit at all times.",
      "Keep to the routes and places allowed by the permit."
    ],
    officialUrl: "https://arunachaltourism.com",
    officialLabel: "Arunachal Pradesh Tourism (official)",
    notes:
      "Rules for foreign nationals (group size, tour operator, allowed areas) change often. Confirm before booking."
  },
  {
    code: "EXTRA",
    appliesTo: "all",
    title: "Local permission for Bum La and Sangetsar Lake",
    whoNeedsIt:
      "Everyone visiting Bum La Pass or Sangetsar (Madhuri) Lake from Tawang, in addition to an ILP or PAP.",
    documents: [
      "Your ILP or PAP",
      "Photo ID",
      "Vehicle and driver details (usually handled by your taxi operator)"
    ],
    steps: [
      "Reach Tawang first; this permission is arranged locally, not online.",
      "Ask your homestay or taxi operator to apply at the Deputy Commissioner's office, usually a day ahead.",
      "Carry your ILP/PAP and ID; they are checked again on the way.",
      "Visits depend on weather and road conditions and may be closed at short notice."
    ],
    areaScope: ["tawang"],
    notes: "Arranged in Tawang after you arrive."
  }
];
