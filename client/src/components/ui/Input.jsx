// Text input with label, hint and error. Works with react-hook-form:
//   <Input label="Email" type="email" required error={errors.email?.message} {...register("email")} />
import { forwardRef } from "react";
import clsx from "clsx";
import { Field } from "./Field.jsx";
import { useFieldIds, describedBy } from "./fieldIds.js";

export const Input = forwardRef(function Input(
  { label, hint, error, required, id, className, ...props },
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
      <input
        ref={ref}
        id={fieldId}
        className={clsx("input", className)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy({ hint, error, hintId, errorId })}
        {...props}
      />
    </Field>
  );
});
