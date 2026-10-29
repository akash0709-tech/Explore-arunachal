// Label + hint + error wrapper shared by Input, Select and Textarea.
// The ids come from fieldIds.js, so screen readers read the hint and the error with the field.
import { Icon } from "./Icon.jsx";

export function Field({ label, required, hint, error, fieldId, hintId, errorId, counter, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={fieldId}>
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      {counter}
    </div>
  );
}
