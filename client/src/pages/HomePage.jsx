// Home page: hero with the quick-plan card, the Guwahati -> Tawang elevation profile,
// the four-step journey and featured destinations. All data comes from the API.
import { useMemo } from "react";
import { Contours } from "../components/layout/Contours.jsx";
import { ElevationProfile } from "../components/charts/ElevationProfile.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { QuickPlanCard } from "../features/home/QuickPlanCard.jsx";
import { FourSteps } from "../features/home/FourSteps.jsx";
import { DestinationCard } from "../features/destinations/DestinationCard.jsx";
import { useDestinations, useRouteGraph } from "../features/destinations/useDestinationData.js";
import { profilePoints, shortestRoute } from "../utils/routeGraph.js";
import { buildPlanUrl } from "../utils/planQuery.js";

export default function HomePage() {
  const destinationsQuery = useDestinations();
  const graphQuery = useRouteGraph();
  const graph = graphQuery.data;

  const profile = useMemo(() => profilePoints(graph, "guwahati", "tawang"), [graph]);
  const guwahatiId = graph?.nodes.find((n) => n.slug === "guwahati")?._id;

  return (
    <>
      <section className="hero page-header on-band" aria-labelledby="hero-title">
        <Contours />
        <div className="container hero__inner">
          <div className="hero__text">
            <p className="page-header__eyebrow">Arunachal Pradesh</p>
            <h1 id="hero-title" className="hero__title">
              Know your permit.
              <span className="hero__title-soft">Plan a realistic hill trip.</span>
            </h1>
            <p className="page-header__subtitle">
              Guwahati to Tawang is about 510 km. A map app calls it one long day. On these roads it is two,
              with a 4,170 m pass in between.
            </p>
          </div>
          <QuickPlanCard />
        </div>

        <div className="container hero__profile">
          {graphQuery.isLoading ? (
            <Skeleton height={220} radius={16} />
          ) : (
            <ElevationProfile points={profile} title="Guwahati to Tawang by road" />
          )}
          <p className="hero__profile-note text-small">
            Road km and altitudes from our route data (sample). Drive times are hill-adjusted, not map
            estimates.
          </p>
        </div>
      </section>

      <FourSteps />

      <section className="container section" aria-labelledby="featured-title">
        <h2 id="featured-title">Featured destinations</h2>
        <p className="text-muted">Pick one to start a plan. Drive times are from Guwahati on hill roads.</p>

        {destinationsQuery.isLoading && (
          <ul className="dest-grid" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton height={300} radius={16} />
              </li>
            ))}
          </ul>
        )}
        {destinationsQuery.isError && (
          <EmptyState icon="alert" title="Could not load destinations">
            Check your connection and try again.
          </EmptyState>
        )}
        {destinationsQuery.data && (
          <ul className="dest-grid">
            {destinationsQuery.data.map((destination, index) => (
              <DestinationCard
                key={destination._id}
                index={index}
                destination={destination}
                driveHours={guwahatiId ? shortestRoute(graph, guwahatiId, destination._id)?.hours : null}
                planUrl={buildPlanUrl({ destinationIds: [destination._id] })}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
