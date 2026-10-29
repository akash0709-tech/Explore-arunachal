// Left panel of the login/signup pages: layered mountain ridges at dusk with a string
// of prayer flags that gently flutter (still when the device asks for reduced motion).
// Decorative only: the quote is real text, the drawing is hidden from screen readers.

const FLAG_COLOURS = ["#3B6FB6", "#FBFBF8", "#C8423A", "#2F7A5A", "#F2C14E"]; // blue, white, red, green, yellow
const FLAG_COUNT = 11;

// The flag string is a quadratic curve; place each flag along it
const STRING = { x0: 30, y0: 300, cx: 300, cy: 370, x1: 590, y1: 250 };
const pointOnString = (t) => {
  const { x0, y0, cx, cy, x1, y1 } = STRING;
  const u = 1 - t;
  return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
};
const FLAGS = Array.from({ length: FLAG_COUNT }, (_, i) => ({
  ...pointOnString((i + 0.7) / (FLAG_COUNT + 0.4)),
  colour: FLAG_COLOURS[i % FLAG_COLOURS.length],
  delay: `${(i % 4) * -0.6}s`
}));

export function AuthIllustration() {
  return (
    <svg
      className="auth-art__svg"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E2730" />
          <stop offset="0.6" stopColor="#13303A" />
          <stop offset="1" stopColor="#1E4450" />
        </linearGradient>
      </defs>
      <rect width="600" height="800" fill="url(#auth-sky)" />

      {/* Evening sun */}
      <circle cx="440" cy="190" r="120" fill="#F2A33A" opacity="0.08" />
      <circle cx="440" cy="190" r="56" fill="#F2A33A" opacity="0.85" />

      {/* Far ridge with snow */}
      <path
        d="M0 470 L70 400 L120 430 L190 340 L250 410 L320 320 L390 400 L450 350 L520 420 L600 370 V800 H0 Z"
        fill="#2A5361"
        opacity="0.7"
      />
      <path
        d="M170 362 L190 340 L210 364 L198 360 L190 368 L182 360 Z M300 342 L320 320 L342 345 L328 341 L320 350 L311 341 Z"
        fill="#E8EEEC"
        opacity="0.85"
      />

      {/* Middle ridges */}
      <path d="M0 540 C90 470 150 500 220 460 S360 430 430 480 S540 470 600 440 V800 H0 Z" fill="#20454F" />
      <path d="M0 610 C120 560 200 590 300 550 S470 560 600 520 V800 H0 Z" fill="#183A44" />

      {/* Pine-green foreground with a few trees */}
      <path d="M0 690 C140 650 260 680 360 650 S520 640 600 620 V800 H0 Z" fill="#1C4A3C" />
      <g fill="#14382D">
        <path d="M80 680 l14 -44 l14 44 Z" />
        <path d="M104 684 l10 -32 l10 32 Z" />
        <path d="M470 652 l14 -46 l14 46 Z" />
        <path d="M496 656 l10 -30 l10 30 Z" />
      </g>

      {/* Prayer flags */}
      <path
        d={`M${STRING.x0} ${STRING.y0} Q${STRING.cx} ${STRING.cy} ${STRING.x1} ${STRING.y1}`}
        fill="none"
        stroke="#C9D3D0"
        strokeWidth="1.5"
        opacity="0.7"
      />
      {FLAGS.map((flag, i) => (
        <rect
          key={i}
          className="auth-art__flag"
          x={flag.x - 12}
          y={flag.y}
          width="24"
          height="30"
          rx="1.5"
          fill={flag.colour}
          opacity="0.92"
          style={{ animationDelay: flag.delay }}
        />
      ))}
    </svg>
  );
}
