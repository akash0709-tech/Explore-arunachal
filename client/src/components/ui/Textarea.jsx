// Multi-line text with an optional character counter (shown when maxLength is set).
import { forwardRef, useState } from "react";
import clsx from "clsx";
import { Field } from "./Field.jsx";
import { useFieldIds, describedBy } from "./fieldIds.js";

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, id, maxLength, className, onChange, ...props },
  ref
) {
  const { fieldId, hintId, errorId } = useFieldIds(id);
  const [length, setLength] = useState(String(props.value ?? props.defaultValue ?? "").length);

  const counter = maxLength ? (
    <span className="field__counter numeric" aria-live="polite">
      {length}/{maxLength}
    </span>
  ) : null;

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      fieldId={fieldId}
      hintId={hintId}
      errorId={errorId}
      counter={counter}
    >
      <textarea
        ref={ref}
        id={fieldId}
        className={clsx("textarea", className)}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy({ hint, error, hintId, errorId })}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        {...props}
      />
    </Field>
  );
});
