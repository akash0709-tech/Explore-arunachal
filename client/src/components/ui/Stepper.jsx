// Number picker: − value +
//   <Stepper label="Travellers" value={2} onChange={setTravellers} min={1} max={20} />
import { useId } from "react";
import { Icon } from "./Icon.jsx";

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  suffix,
  hideLabel = false
}) {
  const labelId = useId();
  const set = (next) => onChange(Math.min(max, Math.max(min, next)));

  return (
    <div className="field">
      <span id={labelId} className={hideLabel ? "sr-only" : "field__label"}>
        {label}
      </span>
      <div className="stepper" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Icon name="minus" />
        </button>
        <output className="stepper__value" aria-live="polite" aria-labelledby={labelId}>
          {value}
          {suffix ? ` ${suffix}` : ""}
        </output>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
