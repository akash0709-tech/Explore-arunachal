function ascii(value) {
  return String(value ?? "")
    .replace(/[₹]/g, "INR ")
    .replace(/[→➜]/g, " to ")
    .replace(/[✓✔]/g, "[x]")
    .replace(/[·•]/g, " | ")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapText(value, width = 88) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function addLine(lines, value = "") {
  lines.push(...wrapText(value));
}

function addSection(lines, title) {
  lines.push("", title.toUpperCase(), "-".repeat(Math.min(title.length, 72)));
}

function pdfString(value) {
  return `(${ascii(value).replace(/[\\()]/g, "\\$&")})`;
}

function createPdf(lines) {
  const linesPerPage = 49;
  const pages = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }
  if (!pages.length) pages.push(["Trip itinerary"]);

  const fontId = 3 + pages.length * 2;
  const objects = new Array(fontId + 1);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const commands = ["BT", "/F1 10 Tf", "48 790 Td", "14 TL"];
    for (const line of pageLines) commands.push(`${pdfString(line)} Tj`, "T*");
    commands.push("ET");
    const content = commands.join("\n");
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([output], { type: "application/pdf" });
}

export function downloadTripPdf(trip, weather) {
  const lines = [];
  const destinations = trip.destinationIds ?? [];
  const start = typeof trip.startId === "object" ? trip.startId?.name : "Start city";
  const destinationNames = destinations.map((place) =>
    typeof place === "object" ? place.name : "Destination"
  );
  const title = trip.title || `${start} to ${destinationNames.at(-1) || "trip"}`;

  addLine(lines, "EXPLORE ARUNACHAL - OFFLINE TRIP PACK");
  addLine(lines, title);
  addLine(lines, `Saved ${trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-IN") : "date unavailable"}`);
  addLine(lines, `Route: ${[start, ...destinationNames].join(" to ")}`);
  addLine(lines, `${trip.days} days | ${trip.travellers} traveller(s) | ${trip.citizen === "foreign" ? "Foreign national" : "Indian citizen"} | Month ${trip.month}`);

  addSection(lines, "Day-by-day itinerary");
  for (const day of trip.plan?.days ?? []) {
    addLine(lines, `Day ${day.dayNumber}: ${day.fromName} to ${day.toName}`);
    addLine(lines, `  ${day.km ?? 0} km | ${day.hours ? `${day.hours} drive hours` : "Local day"}${day.via?.length ? ` | via ${day.via.join(", ")}` : ""}`);
    if (day.stayName) addLine(lines, `  Night stay: ${day.stayName}${day.stayAltitudeM ? ` (${day.stayAltitudeM} m)` : ""}`);
    if (day.sights?.length) addLine(lines, `  Places: ${day.sights.join(", ")}`);
  }
  if (trip.plan?.warnings?.length) {
    addSection(lines, "Route warnings");
    for (const warning of trip.plan.warnings) addLine(lines, `[${warning.level || "note"}] ${warning.text}`);
  }

  addSection(lines, "Permit notes");
  const permit = trip.permitSnapshot;
  if (permit) {
    addLine(lines, `${permit.title || permit.code}${permit.code ? ` (${permit.code})` : ""}`);
    if (permit.lastVerifiedAt) addLine(lines, `Last verified: ${new Date(permit.lastVerifiedAt).toLocaleDateString("en-IN")}`);
    for (const document of permit.documents ?? []) addLine(lines, `Document: ${document}`);
    for (const step of permit.steps ?? []) addLine(lines, `Step: ${step}`);
    if (permit.officialUrl) addLine(lines, `Official portal: ${permit.officialUrl}`);
  } else {
    addLine(lines, "No permit checklist was saved for this itinerary.");
  }
  for (const item of trip.checklist ?? []) addLine(lines, `${item.done ? "[x]" : "[ ]"} ${item.item}`);
  addLine(lines, "Permit fees are not included. Confirm current requirements on official portals.");

  addSection(lines, "Cost estimate (per person)");
  addLine(lines, `Transport: INR ${Math.round(trip.cost?.transport ?? 0).toLocaleString("en-IN")}`);
  addLine(lines, `Stay: INR ${Math.round(trip.cost?.stay ?? 0).toLocaleString("en-IN")}`);
  addLine(lines, `Food: INR ${Math.round(trip.cost?.food ?? 0).toLocaleString("en-IN")}`);
  addLine(lines, `Total per person: INR ${Math.round(trip.cost?.total ?? 0).toLocaleString("en-IN")}`);
  addLine(lines, `Group total: INR ${Math.round((trip.cost?.total ?? 0) * (trip.travellers ?? 1)).toLocaleString("en-IN")}`);

  if (weather?.days?.length) {
    addSection(lines, "7-day weather forecast");
    for (const day of weather.days) {
      addLine(lines, `${day.date}: ${day.label}, ${Math.round(day.tempMaxC)} / ${Math.round(day.tempMinC)} C, ${day.snowfallCm > 0 ? `${day.snowfallCm} cm snow` : `${day.precipitationMm} mm rain`}, ${day.roadRisk} road risk`);
    }
  }

  if (trip.savedHostIds?.length) {
    addSection(lines, "Saved host contacts");
    for (const host of trip.savedHostIds) {
      const hostName = host.hostId?.name || "Local host";
      const town = host.town?.name || "Town unavailable";
      addLine(lines, `${host.name} | ${town} | ${hostName}${host.phone ? ` | ${host.phone}` : ""}`);
    }
  }

  addSection(lines, "Important");
  addLine(lines, "Travel times and costs are estimates. Explore Arunachal does not issue permits.");
  addLine(lines, "Check road conditions, opening status and official permit rules before travelling.");

  const blob = createPdf(lines);
  const safeName = ascii(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}-offline-pack.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
