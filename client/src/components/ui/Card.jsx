// Rounded card, used only for real objects (a stay, a result, a form).
// interactive: lifts slightly on hover (e.g. a clickable stay card).
import { motion } from "framer-motion";
import clsx from "clsx";

export function Card({ as = "div", interactive = false, flush = false, className, children, ...props }) {
  const classes = clsx("card", interactive && "card--interactive", flush && "card--flush", className);

  if (!interactive) {
    const Tag = as;
    return (
      <Tag className={classes} {...props}>
        {children}
      </Tag>
    );
  }

  const MotionTag = motion[as] ?? motion.div;
  return (
    <MotionTag
      className={classes}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
