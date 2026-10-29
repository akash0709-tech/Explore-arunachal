// Fallback picture for a destination without a cover photo: layered ridges whose height
// follows the destination's altitude, so Tawang looks taller than Itanagar.
export function RidgeArt({ altitudeM = 1500, seed = 0 }) {
  const peak = 30 + Math.min(1, altitudeM / 4200) * 70; // 30-100: how high the main ridge rises
  const shift = (seed % 5) * 22;
  return (
    <svg
      className="ridge-art"
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="320" height="180" fill="#1B3F4B" />
      <circle cx={240 - shift} cy="52" r="20" fill="#F2A33A" opacity="0.85" />
      <path
        d={`M0 ${150 - peak * 0.5} L${60 + shift} ${150 - peak} L${130 + shift} ${150 - peak * 0.55} L${200 + shift / 2} ${150 - peak * 0.9} L320 ${150 - peak * 0.4} V180 H0 Z`}
        fill="#2A5361"
      />
      {altitudeM > 2500 && (
        <path
          d={`M${48 + shift} ${150 - peak * 0.85} L${60 + shift} ${150 - peak} L${72 + shift} ${150 - peak * 0.85} Z`}
          fill="#E8EEEC"
        />
      )}
      <path d="M0 150 C80 128 150 146 220 132 S300 128 320 124 V180 H0 Z" fill="#20454F" />
      <path d="M0 168 C90 156 200 170 320 152 V180 H0 Z" fill="#1C4A3C" />
    </svg>
  );
}
