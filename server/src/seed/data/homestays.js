// SAMPLE HOMESTAYS. These are not real businesses: names, owners and phone numbers
// are made up (phones are +91 90000 001xx). 5 are live and 3 wait for admin review.
// "town" is a destination slug and "hostEmail" a seed user; seed.js turns both into ids.

export const LICENCE_AUTHORITY = "Department of Tourism, Govt. of Arunachal Pradesh (sample)";
const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const NOT_DEEP_WINTER = [3, 4, 5, 6, 7, 8, 9, 10, 11];

const WEST_KAMENG_HOST = "host.westkameng@explorearunachal.test";
const ZIRO_HOST = "host.ziro@explorearunachal.test";

export const homestays = [
  // ----- Dirang -----
  {
    name: "Sangti Riverside Homestay",
    hostEmail: WEST_KAMENG_HOST,
    town: "dirang",
    ownerName: "Pema Dorjee",
    phone: "9000000101",
    whatsapp: "9000000101",
    description:
      "Wooden family house beside the Sangti river, 20 minutes from Dirang market. Home-grown kiwi and apple in season.",
    addressLandmark: "Past Sangti bridge, second house after the school",
    approxLocation: { type: "Point", coordinates: [92.2061, 27.3739] },
    rooms: 3,
    maxGuests: 8,
    roomTypes: ["Double", "Family room"],
    facilities: ["Hot water", "Home-cooked meals", "Parking", "Bonfire"],
    pricePerNight: 1800,
    peakPrice: 2400,
    mealsIncluded: true,
    openMonths: ALL_YEAR,
    status: "live",
    licence: "SAMPLE-WK-0101"
  },
  {
    name: "Dirang Dzong Heritage Stay",
    hostEmail: WEST_KAMENG_HOST,
    town: "dirang",
    ownerName: "Pema Dorjee",
    phone: "9000000102",
    whatsapp: "9000000102",
    description: "Stone-and-wood rooms inside the old Dzong village, walking distance to the fort.",
    addressLandmark: "Dzong village, lane opposite the prayer wheel",
    approxLocation: { type: "Point", coordinates: [92.2645, 27.3573] },
    rooms: 2,
    maxGuests: 5,
    roomTypes: ["Double", "Twin"],
    facilities: ["Hot water", "Home-cooked meals", "Wi-Fi (patchy)"],
    pricePerNight: 1500,
    peakPrice: 2000,
    mealsIncluded: false,
    openMonths: ALL_YEAR,
    status: "pending",
    licence: "SAMPLE-WK-0102"
  },

  // ----- Tawang -----
  {
    name: "Gompa Lane Homestay",
    hostEmail: WEST_KAMENG_HOST,
    town: "tawang",
    ownerName: "Tashi Wangmo",
    phone: "9000000103",
    whatsapp: "9000000103",
    description:
      "Warm Monpa family home on the lane up to Tawang Monastery. Butter tea welcome and heated blankets in winter.",
    addressLandmark: "Monastery road, near the lower stupa",
    approxLocation: { type: "Point", coordinates: [91.8615, 27.5885] },
    rooms: 4,
    maxGuests: 10,
    roomTypes: ["Double", "Family room", "Dorm (4 beds)"],
    facilities: ["Heated blankets", "Hot water", "Home-cooked meals", "Helps with Bum La permission"],
    pricePerNight: 2200,
    peakPrice: 3000,
    mealsIncluded: true,
    openMonths: ALL_YEAR,
    status: "live",
    licence: "SAMPLE-TW-0103"
  },
  {
    name: "Khinmey Village Homestay",
    hostEmail: WEST_KAMENG_HOST,
    town: "tawang",
    ownerName: "Nima Tsering",
    phone: "9000000104",
    whatsapp: "9000000104",
    description: "Quiet village stay near Khinmey monastery, 15 minutes' drive from Tawang town.",
    addressLandmark: "Khinmey village, below the monastery gate",
    approxLocation: { type: "Point", coordinates: [91.8722, 27.6012] },
    rooms: 2,
    maxGuests: 6,
    roomTypes: ["Double", "Family room"],
    facilities: ["Hot water", "Home-cooked meals", "Parking"],
    pricePerNight: 1900,
    peakPrice: 2500,
    mealsIncluded: true,
    openMonths: NOT_DEEP_WINTER,
    status: "pending",
    licence: "SAMPLE-TW-0104"
  },

  // ----- Bomdila -----
  {
    name: "Monastery Hill Homestay",
    hostEmail: WEST_KAMENG_HOST,
    town: "bomdila",
    ownerName: "Lobsang Tsering",
    phone: "9000000105",
    whatsapp: "9000000105",
    description:
      "Family rooms on the hill below Bomdila Monastery, with views over the valley on clear mornings.",
    addressLandmark: "Upper Bomdila, monastery approach road",
    approxLocation: { type: "Point", coordinates: [92.4205, 27.2668] },
    rooms: 3,
    maxGuests: 7,
    roomTypes: ["Double", "Twin"],
    facilities: ["Hot water", "Home-cooked meals", "Parking", "Valley view"],
    pricePerNight: 1600,
    peakPrice: 2200,
    mealsIncluded: false,
    openMonths: ALL_YEAR,
    status: "live",
    licence: "SAMPLE-WK-0105"
  },
  {
    name: "Rhododendron Valley Stay",
    hostEmail: WEST_KAMENG_HOST,
    town: "bomdila",
    ownerName: "Dawa Lhamu",
    phone: "9000000106",
    whatsapp: "9000000106",
    description: "Small garden homestay at the edge of town, surrounded by rhododendron in spring.",
    addressLandmark: "Lower Bomdila, behind the craft centre",
    approxLocation: { type: "Point", coordinates: [92.4101, 27.2602] },
    rooms: 2,
    maxGuests: 4,
    roomTypes: ["Double"],
    facilities: ["Hot water", "Garden"],
    pricePerNight: 1400,
    peakPrice: 1800,
    mealsIncluded: false,
    openMonths: NOT_DEEP_WINTER,
    status: "pending",
    licence: "SAMPLE-WK-0106"
  },

  // ----- Ziro -----
  {
    name: "Apatani Bamboo House",
    hostEmail: ZIRO_HOST,
    town: "ziro",
    ownerName: "Tage Yamang",
    phone: "9000000107",
    whatsapp: "9000000107",
    description:
      "Traditional Apatani bamboo house overlooking the rice fields. Hosts can arrange village walks with a local guide.",
    addressLandmark: "Hong village, near the community hall",
    approxLocation: { type: "Point", coordinates: [93.8455, 27.5524] },
    rooms: 3,
    maxGuests: 8,
    roomTypes: ["Double", "Family room"],
    facilities: ["Home-cooked meals", "Village walks", "Hot water (bucket)"],
    pricePerNight: 1500,
    peakPrice: 2500,
    mealsIncluded: true,
    openMonths: ALL_YEAR,
    status: "live",
    licence: "SAMPLE-LS-0107"
  },
  {
    name: "Hong Village Homestay",
    hostEmail: ZIRO_HOST,
    town: "ziro",
    ownerName: "Hage Ampi",
    phone: "9000000108",
    whatsapp: "9000000108",
    description:
      "Simple rooms in the largest Apatani village, a short walk from the paddy fields and pine groves.",
    addressLandmark: "Hong village, west end",
    approxLocation: { type: "Point", coordinates: [93.8401, 27.5588] },
    rooms: 2,
    maxGuests: 5,
    roomTypes: ["Double", "Twin"],
    facilities: ["Home-cooked meals", "Parking"],
    pricePerNight: 1200,
    peakPrice: 2000,
    mealsIncluded: true,
    openMonths: ALL_YEAR,
    status: "live",
    licence: "SAMPLE-LS-0108"
  }
];
