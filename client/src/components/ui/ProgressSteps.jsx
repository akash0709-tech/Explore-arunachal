// Wizard progress for the dark page header: a bar that fills up plus the step names.
//   <ProgressSteps steps={["Basics", "Photos", "Rooms"]} current={2} />   (current is 1-based)
import { motion } from "framer-motion";
import { Icon } from "./Icon.jsx";

export function ProgressSteps({ steps, current, label = "Progress" }) {
  const percent = ((current - 1) / Math.max(1, steps.length - 1)) * 100;

  return (
    <nav className="steps" aria-label={label}>
      <div
        className="steps__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${steps.length}: ${steps[current - 1]}`}
      >
        <motion.div
          className="steps__fill"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
        />
      </div>
      <ol className="steps__list">
        {steps.map((name, index) => {
          const number = index + 1;
          const state = number < current ? "done" : number === current ? "current" : "todo";
          return (
            <li
              key={name}
              className="steps__item"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="steps__dot">
                {state === "done" ? <Icon name="check" size={13} strokeWidth={3} /> : number}
              </span>
              {name}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
