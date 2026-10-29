import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { checkPermits } from "../../api/permits.js";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { formatAltitude, formatHours, formatKm, formatRupees } from "../../utils/format.js";
import { PermitCard } from "../permits/PermitCard.jsx";
import { TripMap } from "./TripMap.jsx";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
};

function AnimatedAmount({ amount }) {
  const value = useMotionValue(0);
  const spring = useSpring(value, { damping: 28, stiffness: 220 });
  const formatted = useTransform(spring, (current) => formatRupees(current));

  useEffect(() => {
    value.set(amount);
  }, [amount, value]);

  return (
    <motion.span className="numeric">{formatted}</motion.span>
  );
}

function WeatherStrip({ weather, error }) {
  if (error) {
    return <p className="trip-inline-error" role="alert">{error}</p>;
  }
  if (!weather?.days?.length) {
    return <p className="text-muted">A 7-day forecast is not available for this destination right now.</p>;
  }
  return (
    <div className="trip-weather">
      {weather.days.map((day) => (
        <article className="trip-weather__day" key={day.date}>
          <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</strong>
          <span className="trip-weather__label">{day.label}</span>
          <span>{Math.round(day.tempMaxC)}° / {Math.round(day.tempMinC)}°C</span>
          <span className="text-small">
            {day.snowfallCm > 0 ? `${day.snowfallCm} cm snow` : `${day.precipitationMm} mm rain`}
          </span>
          <span className={`trip-risk trip-risk--${day.roadRisk}`}>{day.roadRisk} road risk</span>
        </article>
      ))}
    </div>
  );
}

function CostCard({ cost, travellers }) {
  const groupTotal = (cost?.total ?? 0) * travellers;
  return (
    <section className="trip-result-card" aria-labelledby="trip-cost-title">
      <h2 id="trip-cost-title">Cost estimate</h2>
      <dl className="trip-cost-list">
        <div><dt>Transport per person</dt><dd><AnimatedAmount amount={cost?.transport ?? 0} /></dd></div>
        <div><dt>Stay per person</dt><dd><AnimatedAmount amount={cost?.stay ?? 0} /></dd></div>
        <div><dt>Food per person</dt><dd><AnimatedAmount amount={cost?.food ?? 0} /></dd></div>
        <div className="trip-cost-list__total"><dt>Total per person</dt><dd><AnimatedAmount amount={cost?.total ?? 0} /></dd></div>
      </dl>
      <p className="trip-cost-group">
        Group total for {travellers}: <strong><AnimatedAmount amount={groupTotal} /></strong>
      </p>
      <p className="text-small text-muted">Permit fee is not included; check the official portal.</p>
    </section>
  );
}

export function TripResults({
  citizen,
  plan,
  orderedDestinations,
  weather,
  weatherError,
  geometry,
  geometryLoading,
  geometryError,
  travellers,
  actions
}) {
  const slugs = orderedDestinations.map((destination) => destination.slug).filter(Boolean);
  const permitQuery = useQuery({
    queryKey: ["permits", "trip-result", citizen, [...slugs].sort().join(",")],
    queryFn: () => checkPermits({ citizen, destinations: slugs }),
    enabled: Boolean(citizen && slugs.length),
    networkMode: "always",
    retry: false
  });

  return (
    <motion.div
      className="trip-results"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      <motion.section className="trip-result-section" variants={reveal}>
        <h2>Permit requirements</h2>
        {permitQuery.data ? (
          <PermitCard result={permitQuery.data} isUpdating={permitQuery.isFetching} />
        ) : permitQuery.isError ? (
          <p className="trip-inline-error" role="alert">{getErrorMessage(permitQuery.error)}</p>
        ) : (
          <div className="trip-result-placeholder" role="status">Checking current permit rules…</div>
        )}
      </motion.section>

      <motion.section className="trip-result-card" variants={reveal} aria-labelledby="trip-plan-title">
        <div className="trip-result-card__heading">
          <div>
            <p className="page-header__eyebrow">Smart itinerary</p>
            <h2 id="trip-plan-title">Your {plan.days.length}-day plan</h2>
          </div>
          <span className="trip-result-total-distance">{formatKm(plan.totalKm)}</span>
        </div>
        {plan.warnings.length > 0 && (
          <div className="trip-warnings" aria-label="Route warnings">
            {plan.warnings.map((warning, index) => (
              <p className={`trip-warning trip-warning--${warning.level}`} key={`${index}-${warning.text}`}>
                {warning.text}
              </p>
            ))}
          </div>
        )}
        <div className="trip-table-wrap">
          <table className="trip-day-table">
            <thead>
              <tr><th>Day</th><th>Route</th><th>Drive time</th><th>Night stay</th></tr>
            </thead>
            <tbody>
              {plan.days.map((day) => (
                <tr key={day.dayNumber}>
                  <th scope="row">Day {day.dayNumber}<small>{day.type === "local" ? "Local day" : "Drive"}</small></th>
                  <td>
                    <strong>{day.fromName} → {day.toName}</strong>
                    {day.via?.length > 0 && <small>via {day.via.join(" · ")}</small>}
                    <small>{formatKm(day.km)}</small>
                    {day.sights?.length > 0 && <small>{day.sights.join(" · ")}</small>}
                  </td>
                  <td>
                    <span className="trip-drive-time">{day.hours > 0 ? formatHours(day.hours) : "—"}</span>
                    <span
                      className={`trip-drive-bar${day.hours > 7 ? " trip-drive-bar--long" : ""}`}
                      role="img"
                      aria-label={`${day.hours} drive hours`}
                    >
                      <motion.i
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (day.hours / 9.5) * 100)}%` }}
                        transition={{ duration: 0.65, delay: day.dayNumber * 0.06 }}
                      />
                    </span>
                  </td>
                  <td>
                    {day.stayName ? (
                      <><strong>{day.stayName}</strong><small>{day.stayAltitudeM ? formatAltitude(day.stayAltitudeM) : "Altitude unavailable"}</small></>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section className="trip-result-card" variants={reveal} aria-labelledby="trip-map-title">
        <div className="trip-result-card__heading">
          <div><p className="page-header__eyebrow">OpenStreetMap</p><h2 id="trip-map-title">Route map</h2></div>
        </div>
        <TripMap geometry={geometry} isLoading={geometryLoading} error={geometryError} />
        <p className="text-small text-muted">Map geometry is for orientation; travel times come from our hill-road route estimates.</p>
      </motion.section>

      <motion.section className="trip-result-card" variants={reveal} aria-labelledby="trip-weather-title">
        <h2 id="trip-weather-title">Weather at your farthest stop</h2>
        <WeatherStrip weather={weather} error={weatherError} />
      </motion.section>

      <motion.div variants={reveal}>
        <CostCard cost={plan.cost} travellers={travellers} />
      </motion.div>
      {actions && <motion.div className="trip-result-actions" variants={reveal}>{actions}</motion.div>}
    </motion.div>
  );
}
