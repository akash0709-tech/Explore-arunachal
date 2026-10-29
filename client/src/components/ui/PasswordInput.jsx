// Password field with a Show / Hide button. Works with react-hook-form like <Input>.
import { forwardRef, useState } from "react";
import { Field } from "./Field.jsx";
import { useFieldIds, describedBy } from "./fieldIds.js";

export const PasswordInput = forwardRef(function PasswordInput(
  { label = "Password", hint, error, required, id, children, ...props },
  ref
) {
  const { fieldId, hintId, errorId } = useFieldIds(id);
  const [visible, setVisible] = useState(false);

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
      <div className="input-affix">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? "text" : "password"}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy({ hint, error, hintId, errorId })}
          {...props}
        />
        <button
          type="button"
          className="input-affix__btn"
          aria-pressed={visible}
          aria-controls={fieldId}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {children}
    </Field>
  );
});
