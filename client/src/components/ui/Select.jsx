// Native select (best on phones) with label, hint and error.
//   <Select label="Start city" options={[{ value: "id1", label: "Guwahati" }]} placeholder="Choose..." />
import { forwardRef } from "react";
import clsx from "clsx";
import { Field } from "./Field.jsx";
import { useFieldIds, describedBy } from "./fieldIds.js";

export const Select = forwardRef(function Select(
  { label, hint, error, required, id, options = [], placeholder, className, children, ...props },
  ref
) {
  const { fieldId, hintId, errorId } = useFieldIds(id);
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      fieldId={fieldId}
      hintId={hintId}
      errorId={errorId}
    >
      <select
        ref={ref}
        id={fieldId}
        className={clsx("select", className)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy({ hint, error, hintId, errorId })}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
});
