// Two or three options in one pill, with a sliding highlight (a radio group underneath).
//   <SegmentedControl label="Traveller" value={citizen} onChange={setCitizen}
//     options={[{ value: "indian", label: "Indian citizen" }, { value: "foreign", label: "Foreign national" }]} />
import { useId, useRef } from "react";
import { motion } from "framer-motion";

export function SegmentedControl({ label, options, value, onChange, hideLabel = false }) {
  const labelId = useId();
  const groupId = useId();
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="field">
      <span id={labelId} className={hideLabel ? "sr-only" : "field__label"}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => (refs.current[index] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className="segmented__option"
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {selected && (
                <motion.span
                  className="segmented__thumb"
                  layoutId={`${groupId}-thumb`}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="segmented__label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
