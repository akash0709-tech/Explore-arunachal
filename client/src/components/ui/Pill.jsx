// Small status label.  tone: "ok" (green) | "warn" (amber) | "bad" (red) | "mute" (grey)
//   <Pill tone="ok" icon="check">Verified</Pill>
import { Icon } from "./Icon.jsx";

export function Pill({ tone = "mute", icon, children }) {
  return (
    <span className={`pill pill--${tone}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
