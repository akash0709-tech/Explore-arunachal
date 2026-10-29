// Grey shimmering placeholder shown while data loads.
//   <Skeleton height={180} radius={16} />   or   <Skeleton lines={3} />
export function Skeleton({ width = "100%", height = 16, radius, lines }) {
  if (lines) {
    return (
      <span className="stack" style={{ gap: 8 }} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="skeleton" style={{ width: i === lines - 1 ? "60%" : "100%", height }} />
        ))}
      </span>
    );
  }
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

/** Placeholder for a whole page while it loads (lazy route or auth check) */
export function PageLoader() {
  return (
    <div className="container page-loader" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton height={36} width="45%" />
      <Skeleton lines={3} />
      <Skeleton height={180} radius={16} />
    </div>
  );
}
