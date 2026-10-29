// Toggle chip. It "pops" (quick scale bounce) when it becomes selected.
//   <Chip selected={interests.includes("Monasteries")} onToggle={() => toggle("Monasteries")}>Monasteries</Chip>
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon.jsx";

export function Chip({ selected = false, onToggle, children, disabled, ...props }) {
  const controls = useAnimationControls();
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (selected && !wasSelected.current)
      controls.start({ scale: [1, 1.12, 1], transition: { duration: 0.28 } });
    wasSelected.current = selected;
  }, [selected, controls]);

  return (
    <motion.button
      type="button"
      className="chip"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      animate={controls}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {selected && <Icon name="check" size={16} />}
      {children}
    </motion.button>
  );
}

// A labelled group of chips for multi-select questions
export function ChipGroup({ label, children }) {
  return (
    <div role="group" aria-label={label} className="chip-group">
      {children}
    </div>
  );
}
