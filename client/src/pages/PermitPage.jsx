// Permit Wizard: choose Indian / foreign and the places you will visit; the permit card
// updates from the API (GET /permits/check) after every change.
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { Chip, ChipGroup } from "../components/ui/Chip.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { PermitCard } from "../features/permits/PermitCard.jsx";
import { usePermitCheck } from "../features/permits/usePermitCheck.js";
import { useDestinations } from "../features/destinations/useDestinationData.js";
import { CITIZEN_OPTIONS } from "../utils/constants.js";
import { buildPlanUrl } from "../utils/planQuery.js";
import { getErrorMessage } from "../utils/apiErrors.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

export default function PermitPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [searchParams] = useSearchParams();
  const { data: destinations = [], isLoading: loadingPlaces } = useDestinations();

  // Optional starting values from the URL: /permit?citizen=foreign&dest=tawang,dirang
  const [citizen, setCitizen] = useState(searchParams.get("citizen") === "foreign" ? "foreign" : "indian");
  const [slugs, setSlugs] = useState(() => (searchParams.get("dest") || "tawang").split(",").filter(Boolean));

  const toggle = (slug) =>
    setSlugs((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]));
  const permit = usePermitCheck({ citizen, slugs });

  const chosenIds = useMemo(
    () => destinations.filter((d) => slugs.includes(d.slug)).map((d) => d._id),
    [destinations, slugs]
  );

  return (
    <>
      <PageHeader
        eyebrow="Permit Wizard"
        title="Which permit do I need?"
        subtitle="Choose who is travelling and where. We show the permit, the documents, the steps and the official link."
      />

      <section className="container section permit-layout">
        <Card
          className="stack permit-form"
          as="form"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Your trip"
        >
          <SegmentedControl
            label="Who is travelling?"
            options={CITIZEN_OPTIONS}
            value={citizen}
            onChange={setCitizen}
          />

          <div className="field">
            <span className="field__label">Where are you going?</span>
            {loadingPlaces ? (
              <Skeleton height={38} />
            ) : (
              <ChipGroup label="Destinations">
                {destinations.map((d) => (
                  <Chip key={d.slug} selected={slugs.includes(d.slug)} onToggle={() => toggle(d.slug)}>
                    {d.name}
                  </Chip>
                ))}
              </ChipGroup>
            )}
          </div>

          <Button
            size="lg"
            block
            disabled={chosenIds.length === 0 || !isOnline}
            title={!isOnline ? "Connect to the internet to build a trip plan." : undefined}
            onClick={() => navigate(buildPlanUrl({ citizen, destinationIds: chosenIds }))}
          >
            Build a plan with this permit
          </Button>
        </Card>

        <div className="permit-result" aria-live="polite">
          {slugs.length === 0 ? (
            <EmptyState icon="mapPin" title="Pick at least one place">
              Choose where you are going to see the permits you need.
            </EmptyState>
          ) : permit.isError ? (
            <EmptyState icon="alert" title="Could not check permits">
              {getErrorMessage(permit.error)}
            </EmptyState>
          ) : permit.data ? (
            <PermitCard result={permit.data} isUpdating={permit.isFetching || permit.isPlaceholderData} />
          ) : (
            <Skeleton height={420} radius={16} />
          )}
        </div>
      </section>
    </>
  );
}
