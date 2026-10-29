// "Plan in 10 seconds" card in the home hero: traveller type, start city and days,
// then off to /plan with those values in the URL.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card.jsx";
import { SegmentedControl } from "../../components/ui/SegmentedControl.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useStartCities } from "../destinations/useDestinationData.js";
import { buildPlanUrl } from "../../utils/planQuery.js";
import { CITIZEN_OPTIONS } from "../../utils/constants.js";

export function QuickPlanCard() {
  const navigate = useNavigate();
  const { data: startCities = [], isLoading } = useStartCities();
  const [citizen, setCitizen] = useState("indian");
  const [startId, setStartId] = useState("");
  const [days, setDays] = useState(6);

  // Default to Guwahati (the usual gateway) once the list has loaded
  const chosenStart =
    startId || startCities.find((c) => c.slug === "guwahati")?._id || startCities[0]?._id || "";

  const submit = (event) => {
    event.preventDefault();
    navigate(buildPlanUrl({ citizen, startId: chosenStart, days }));
  };

  return (
    <Card as="form" className="quick-plan stack" onSubmit={submit} aria-label="Quick plan">
      <h2 className="quick-plan__title">Start a plan</h2>
      <SegmentedControl label="Traveller" options={CITIZEN_OPTIONS} value={citizen} onChange={setCitizen} />
      <Select
        label="Start city"
        value={chosenStart}
        onChange={(e) => setStartId(e.target.value)}
        disabled={isLoading}
        options={startCities.map((c) => ({ value: c._id, label: c.name }))}
        placeholder={isLoading ? "Loading…" : undefined}
      />
      <Stepper
        label="Days"
        value={days}
        onChange={setDays}
        min={1}
        max={21}
        suffix={days === 1 ? "day" : "days"}
      />
      <Button type="submit" size="lg" block disabled={!chosenStart}>
        Plan my trip
      </Button>
    </Card>
  );
}
