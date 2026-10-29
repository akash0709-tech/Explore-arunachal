// Logo: a small mountain mark + the name. Links to the home page.
import { Link } from "react-router-dom";

export function MountainMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--c-band-2)" />
      <path d="M8 46 L24 22 L32 33 L40 20 L56 46 Z" fill="var(--c-primary)" />
      <path d="M40 20 L45 28 L42 27 L40 30 L37 27 L35 28 Z" fill="#FBFBF8" />
      <path d="M8 50 H56" stroke="var(--c-success)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Explore Arunachal, home">
      <MountainMark />
      <span>Explore Arunachal</span>
    </Link>
  );
}
