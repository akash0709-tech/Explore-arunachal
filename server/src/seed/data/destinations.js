// SAMPLE DATA. Places used by the planner, map and Permit Wizard.
// Coordinates are approximate and written as [longitude, latitude] (GeoJSON order).
//
// inArunachal: true  -> the seed links the ILP and PAP rules to this place.
// Extra local rules (e.g. Tawang) are linked through PermitRule.areaScope.
//
// Guwahati is a start city outside Arunachal, so it is also marked isWaypoint:
// it appears in the "start from" picker but not in the "places to visit" list.

export const destinations = [
  // ----- Start cities -----
  {
    name: "Guwahati",
    slug: "guwahati",
    district: "Kamrup Metropolitan, Assam",
    altitudeM: 55,
    location: { type: "Point", coordinates: [91.7362, 26.1445] },
    bestMonths: [10, 11, 12, 1, 2, 3],
    overview:
      "The usual gateway to western Arunachal, with the nearest major airport and railway station. Most Tawang trips start here with an early-morning drive.",
    attractions: [
      { name: "Kamakhya Temple", note: "Hilltop temple, go early to avoid queues" },
      { name: "Umananda Island", note: "Short ferry ride across the Brahmaputra" },
      { name: "Assam State Museum", note: "Good overview of the region's history" }
    ],
    isStartCity: true,
    isWaypoint: true,
    inArunachal: false
  },
  {
    name: "Itanagar",
    slug: "itanagar",
    district: "Papum Pare",
    altitudeM: 320,
    location: { type: "Point", coordinates: [93.6053, 27.0844] },
    bestMonths: [10, 11, 12, 1, 2, 3, 4],
    overview:
      "The state capital and the starting point for central Arunachal, including Ziro. Banderdewa is the nearest ILP checkpoint on the Assam border.",
    attractions: [
      { name: "Ita Fort", note: "Brick ruins that give the city its name" },
      { name: "Ganga Lake (Gyakar Sinyi)", note: "Forest lake 6 km from the city" },
      { name: "Jawaharlal Nehru State Museum", note: "Tribal crafts, costumes and history" }
    ],
    isStartCity: true,
    isWaypoint: false,
    inArunachal: true
  },

  // ----- Waypoints on the Tawang road -----
  {
    name: "Bhalukpong",
    slug: "bhalukpong",
    district: "West Kameng",
    altitudeM: 213,
    location: { type: "Point", coordinates: [92.645, 27.0136] },
    bestMonths: [10, 11, 12, 1, 2, 3, 4],
    overview:
      "Entry checkpoint into Arunachal on the road from Assam to Bomdila and Tawang. Keep your e-ILP ready here.",
    attractions: [
      { name: "Kameng River", note: "Riverside camps and rafting" },
      { name: "Tipi Orchid Research Centre", note: "Hundreds of orchid species, 5 km away" },
      { name: "Pakke Tiger Reserve", note: "Nearby forest reserve, entry by permit" }
    ],
    isWaypoint: true,
    inArunachal: true
  },
  {
    name: "Sela Pass",
    slug: "sela-pass",
    district: "Tawang",
    altitudeM: 4170,
    location: { type: "Point", coordinates: [92.107, 27.504] },
    bestMonths: [3, 4, 5, 10, 11],
    overview:
      "High mountain pass between Dirang and Tawang. Snow and ice are common from December to March; carry warm layers and expect slow driving.",
    attractions: [
      { name: "Sela Lake", note: "Often frozen in winter" },
      { name: "Jaswantgarh War Memorial", note: "On the Tawang side of the pass" },
      { name: "Nuranang (Jang) Falls", note: "Large waterfall near Jang" }
    ],
    isWaypoint: true,
    isPass: true,
    inArunachal: true
  },

  // ----- Destinations -----
  {
    name: "Bomdila",
    slug: "bomdila",
    district: "West Kameng",
    altitudeM: 2415,
    location: { type: "Point", coordinates: [92.4159, 27.2645] },
    bestMonths: [3, 4, 5, 9, 10, 11],
    overview:
      "Hill town with monasteries and wide Himalayan views. A common overnight stop that helps you get used to the altitude before Tawang.",
    attractions: [
      { name: "Bomdila Monastery", note: "Gentse Gaden Rabgye Ling, upper town" },
      { name: "Bomdila View Point", note: "Clear mornings show the snow peaks" },
      { name: "Eaglenest Wildlife Sanctuary", note: "Birding hotspot, 2-3 hours away" }
    ],
    inArunachal: true
  },
  {
    name: "Dirang",
    slug: "dirang",
    district: "West Kameng",
    altitudeM: 1497,
    location: { type: "Point", coordinates: [92.2409, 27.3584] },
    bestMonths: [3, 4, 5, 9, 10, 11],
    overview:
      "A lower, milder valley on the Tawang road, with apple and kiwi orchards and riverside villages. A good night's rest before crossing Sela Pass.",
    attractions: [
      { name: "Dirang Dzong", note: "Old stone fort village" },
      { name: "Sangti Valley", note: "Riverside valley, black-necked cranes in winter" },
      { name: "Dirang hot springs", note: "Short walk from the main road" }
    ],
    inArunachal: true
  },
  {
    name: "Tawang",
    slug: "tawang",
    district: "Tawang",
    altitudeM: 3048,
    location: { type: "Point", coordinates: [91.8594, 27.586] },
    bestMonths: [3, 4, 5, 9, 10, 11],
    overview:
      "High-altitude town known for its large monastery and lakes near the border. Nights are cold all year; plan a rest day before going higher.",
    attractions: [
      { name: "Tawang Monastery", note: "One of the largest Buddhist monasteries in India" },
      { name: "Tawang War Memorial", note: "Evening light-and-sound show" },
      { name: "Sangetsar (Madhuri) Lake", note: "Needs an extra local permission" }
    ],
    extraPermitNote:
      "Bum La and Sangetsar Lake need an extra local permission, arranged in Tawang after you arrive.",
    inArunachal: true
  },
  {
    name: "Ziro",
    slug: "ziro",
    district: "Lower Subansiri",
    altitudeM: 1688,
    location: { type: "Point", coordinates: [93.8282, 27.5634] },
    bestMonths: [3, 4, 9, 10, 11],
    overview:
      "A wide valley of rice fields and pine hills, home to the Apatani people. Famous for its September music festival.",
    attractions: [
      { name: "Apatani villages (Hong, Hari)", note: "Traditional bamboo houses" },
      { name: "Talley Valley Wildlife Sanctuary", note: "Forest trek, go with a local guide" },
      { name: "Kile Pakho ridge", note: "Viewpoint over the whole valley" }
    ],
    inArunachal: true
  }
];
