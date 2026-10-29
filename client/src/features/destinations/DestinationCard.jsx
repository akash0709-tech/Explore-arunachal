// A destination on the home page: picture, name, district, altitude, drive time from
// Guwahati and best months. The whole card links to /plan with this destination chosen.
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Pill } from "../../components/ui/Pill.jsx";
import { Icon } from "../../components/ui/Icon.jsx";
import { RidgeArt } from "./RidgeArt.jsx";
import { formatAltitude, formatHours, formatMonths } from "../../utils/format.js";
import { thumbnailUrl } from "../../utils/images.js";

export function DestinationCard({ destination, driveHours, planUrl, index = 0 }) {
  const { name, district, altitudeM, bestMonths, coverImage, isSample } = destination;

  return (
    <motion.li
      className="dest-card"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -5 }}
    >
      <Link to={planUrl} className="dest-card__link">
        <div className="dest-card__media">
          {coverImage?.url ? (
            <img src={thumbnailUrl(coverImage.url, 600)} alt="" loading="lazy" />
          ) : (
            <RidgeArt altitudeM={altitudeM} seed={index} />
          )}
          {isSample && (
            <span className="dest-card__badge">
              <Pill>Sample data</Pill>
            </span>
          )}
        </div>
        <div className="dest-card__body">
          <div>
            <h3 className="dest-card__title">{name}</h3>
            <p className="text-small text-muted">{district}</p>
          </div>
          <dl className="dest-card__facts">
            <div>
              <dt>Altitude</dt>
              <dd>{formatAltitude(altitudeM)}</dd>
            </div>
            <div>
              <dt>From Guwahati</dt>
              <dd>{driveHours != null ? `${formatHours(driveHours)} drive` : "—"}</dd>
            </div>
            <div>
              <dt>Best months</dt>
              <dd>{formatMonths(bestMonths) || "—"}</dd>
            </div>
          </dl>
          <span className="dest-card__cta">
            Plan a trip here <Icon name="chevronRight" size={16} />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}
