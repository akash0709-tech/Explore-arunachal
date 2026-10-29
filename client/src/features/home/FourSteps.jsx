// "From permit to pillow, in four steps": numbered because it is a real sequence.
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "../../components/ui/Icon.jsx";

const STEPS = [
  {
    to: "/permit",
    icon: "shield",
    title: "Permit wizard",
    text: "See which permit you need, the documents and the official link."
  },
  {
    to: "/plan",
    icon: "calendar",
    title: "Smart itinerary",
    text: "Day-by-day plan with real hill-road hours and season warnings."
  },
  {
    to: "/saved",
    icon: "wifiOff",
    title: "Offline pack",
    text: "Save your trip; it still opens when the signal drops."
  },
  {
    to: "/stays",
    icon: "check",
    title: "Verified hosts",
    text: "Homestays checked by the tourism review team. Call or WhatsApp."
  }
];

export function FourSteps() {
  return (
    <section className="container section" aria-labelledby="four-steps-title">
      <h2 id="four-steps-title">From permit to pillow, in four steps</h2>
      <ol className="four-steps">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.to}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
          >
            <Link to={step.to} className="step-card">
              <span className="step-card__number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="step-card__icon">
                <Icon name={step.icon} size={24} />
              </span>
              <strong className="step-card__title">{step.title}</strong>
              <span className="text-small text-muted">{step.text}</span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
