// Helpers that connect a form control to its label, hint and error (used with Field.jsx).
import { useId } from "react";

export function useFieldIds(id) {
  const generated = useId();
  const fieldId = id ?? generated;
  return { fieldId, hintId: `${fieldId}-hint`, errorId: `${fieldId}-error` };
}

// aria-describedby for the control: hint and/or error ids
export const describedBy = ({ hint, error, hintId, errorId }) =>
  [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
