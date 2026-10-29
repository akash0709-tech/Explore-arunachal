// Pill-shaped button.
//   <Button>Plan my trip</Button>                       primary (marigold, dark text)
//   <Button variant="ghost" size="sm">Cancel</Button>   variants: primary ghost dark success danger
//   <Button loading>Saving</Button>                     shows a spinner and blocks clicks
//   <ButtonLink to="/plan">Plan</ButtonLink>            same look, but a router link
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { buttonClass } from "./buttonClass.js";

export const Button = forwardRef(function Button(
  { variant, size, block, loading = false, disabled, type = "button", className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Keep the label in place (hidden) so the button does not change size while loading */}
      <span className={clsx("row", loading && "btn__label--hidden")} style={{ gap: 8, flexWrap: "nowrap" }}>
        {children}
      </span>
      {loading && (
        <span className="btn__spinner">
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </span>
      )}
    </button>
  );
});

export function ButtonLink({ variant, size, block, className, ...props }) {
  return <Link className={buttonClass({ variant, size, block, className })} {...props} />;
}
