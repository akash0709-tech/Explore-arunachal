// Class names for a button look, shared by <Button> and <ButtonLink> (and usable on any element).
import clsx from "clsx";

export const buttonClass = ({ variant = "primary", size = "md", block = false, className } = {}) =>
  clsx(
    "btn",
    variant !== "primary" && `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    block && "btn--block",
    className
  );
