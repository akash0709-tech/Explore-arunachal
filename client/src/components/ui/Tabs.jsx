// Tabs with an underline that slides to the selected tab.
//   <Tabs label="Queue filter" tabs={[{ id: "pending", label: "Pending" }]} value={tab} onChange={setTab} />
// Arrow keys move between tabs (standard tablist keyboard pattern).
import { useId, useRef } from "react";
import { motion } from "framer-motion";

export function Tabs({ label, tabs, value, onChange }) {
  const groupId = useId();
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1 };
    let next = null;
    if (event.key in moves) next = (index + moves[event.key] + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="tab"
            id={`${groupId}-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="tabs__tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="text-muted"> ({tab.count})</span>}
            {selected && (
              <motion.span
                className="tabs__underline"
                layoutId={`${groupId}-underline`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
