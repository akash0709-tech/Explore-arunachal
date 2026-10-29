// "I'm a traveller" / "I'm a host / business" choice. Works as a radio group:
// arrow keys move between the two cards, the selected one turns pine green.
import { useRef } from "react";
import { motion } from "framer-motion";
import { Icon } from "../../components/ui/Icon.jsx";

const ROLES = [
  {
    value: "traveller",
    title: "I'm a traveller",
    text: "Check permits, plan trips and save them offline.",
    icon: "compass"
  },
  {
    value: "host",
    title: "I'm a host / business",
    text: "List your homestay and get the Verified badge.",
    icon: "mapPin"
  }
];

export function RoleCards({ value, onChange }) {
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const next = (index + 1) % ROLES.length; // only two cards: any arrow switches
    onChange(ROLES[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="role-cards" role="radiogroup" aria-label="I am signing up as">
      {ROLES.map((role, index) => {
        const selected = value === role.value;
        return (
          <motion.button
            key={role.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="role-card"
            onClick={() => onChange(role.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            whileTap={{ scale: 0.98 }}
          >
            <span className="role-card__icon">
              <Icon name={selected ? "check" : role.icon} size={20} />
            </span>
            <strong>{role.title}</strong>
            <span className="text-small text-muted">{role.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
