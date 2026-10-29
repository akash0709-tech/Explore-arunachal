// Elevation profile of a road trip, e.g. Guwahati -> Tawang, drawn as SVG.
//   - x: kilometres from the start, y: altitude
//   - the orange line draws itself, then the stops appear one by one
//   - mountain passes (Sela Pass) are highlighted
//   - a small dot then travels along the road
// With "reduce motion" everything is shown at once and nothing moves.
// Data comes from the API (destination altitudes + road km); see utils/routeGraph.js.
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatAltitude, formatKm } from "../../utils/format.js";

const WIDTH = 760;
const HEIGHT = 280;
const PAD = { top: 56, right: 40, bottom: 34, left: 48 };
const DRAW_SECONDS = 1.6;

export function ElevationProfile({ points, title = "Elevation profile" }) {
  const reduceMotion = useReducedMotion();
  // useId() returns ":r1:"; colons can break url(#...) references in SVG, so remove them
  const baseId = useId().replace(/:/g, "");
  const pathId = `${baseId}-road`;
  const gradientId = `${baseId}-fill`;
  if (!points || points.length < 2) return null;

  const maxKm = points[points.length - 1].km;
  const maxAlt = Math.ceil((Math.max(...points.map((p) => p.altitudeM)) * 1.12) / 1000) * 1000;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (km) => PAD.left + (km / maxKm) * plotW;
  const y = (alt) => PAD.top + plotH - (alt / maxAlt) * plotH;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.km).toFixed(1)} ${y(p.altitudeM).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(maxKm)} ${PAD.top + plotH} L${x(0)} ${PAD.top + plotH} Z`;
  const gridLines = Array.from({ length: maxAlt / 1000 }, (_, i) => (i + 1) * 1000);
  const kmTicks = Array.from({ length: Math.floor(maxKm / 100) + 1 }, (_, i) => i * 100);

  const summary = `${title}: ${points
    .map((p) => `${p.name} at ${formatKm(p.km)}, ${formatAltitude(p.altitudeM)}`)
    .join("; ")}.`;

  // Label below a point only when it is a dip between two higher neighbours
  const labelBelow = (i) =>
    i > 0 &&
    i < points.length - 1 &&
    points[i - 1].altitudeM > points[i].altitudeM &&
    points[i + 1].altitudeM > points[i].altitudeM;
  const anchor = (i) => (i === 0 ? "start" : i === points.length - 1 ? "end" : "middle");
  const stopDelay = (i) => (reduceMotion ? 0 : DRAW_SECONDS * (points[i].km / maxKm) + 0.15);

  return (
    <figure className="elevation">
      <div className="elevation__scroll">
        <svg className="elevation__svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F2A33A" stopOpacity="0.32" />
              <stop offset="1" stopColor="#F2A33A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Altitude grid */}
          {gridLines.map((alt) => (
            <g key={alt} className="elevation__grid">
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(alt)} y2={y(alt)} />
              <text x={PAD.left - 8} y={y(alt) + 4} textAnchor="end">
                {alt / 1000}k m
              </text>
            </g>
          ))}
          {/* Distance axis */}
          <line
            className="elevation__axis"
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
          />
          {kmTicks.map((km) => (
            <text key={km} className="elevation__tick" x={x(km)} y={HEIGHT - 10} textAnchor="middle">
              {km} km
            </text>
          ))}

          {/* Filled area, then the line that draws itself */}
          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: DRAW_SECONDS * 0.6, duration: 0.8 }}
          />
          <motion.path
            id={pathId}
            d={line}
            className="elevation__line"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: DRAW_SECONDS, ease: "easeInOut" }}
          />

          {/* Stops */}
          {points.map((p, i) => {
            const below = labelBelow(i);
            const px = x(p.km);
            const py = y(p.altitudeM);
            return (
              <motion.g
                key={p.name}
                className={p.isPass ? "elevation__stop elevation__stop--pass" : "elevation__stop"}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stopDelay(i), duration: 0.35 }}
              >
                <circle cx={px} cy={py} r={p.isPass ? 7 : 5} />
                <text x={px} y={below ? py + 22 : py - 26} textAnchor={anchor(i)} className="elevation__name">
                  {p.isPass ? `▲ ${p.name}` : p.name}
                </text>
                <text x={px} y={below ? py + 37 : py - 12} textAnchor={anchor(i)} className="elevation__meta">
                  {formatKm(p.km)} · {formatAltitude(p.altitudeM)}
                </text>
              </motion.g>
            );
          })}

          {/* A small "vehicle" that travels the road once everything is drawn */}
          {!reduceMotion && (
            // Hidden until it starts moving (otherwise it would sit in the top-left corner)
            <circle r="5" className="elevation__traveller" opacity="0">
              <set attributeName="opacity" to="1" begin={`${DRAW_SECONDS + 1.2}s`} />
              <animateMotion dur="7s" begin={`${DRAW_SECONDS + 1.2}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          )}
        </svg>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
