// Faint topographic contour lines drawn behind dark page headers.
// Purely decorative, so it is hidden from screen readers.
const WAVES = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const y = 40 + i * 38;
  return `M-20 ${y} C 180 ${y - 46}, 360 ${y + 42}, 600 ${y - 4} S 980 ${y - 58}, 1220 ${y + 14}`;
});
const RINGS = [1, 2, 3, 4, 5].map((i) => ({ rx: 60 + i * 42, ry: 34 + i * 24 }));

export function Contours({ className = "page-header__contours" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {WAVES.map((d) => (
          <path key={d} d={d} />
        ))}
        {/* A "summit" of rings near the right edge */}
        {RINGS.map(({ rx, ry }) => (
          <ellipse key={rx} cx="1010" cy="120" rx={rx} ry={ry} transform="rotate(-12 1010 120)" />
        ))}
      </g>
    </svg>
  );
}
