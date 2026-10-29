// A button that asks "Are you sure?" in place before doing something destructive.
//   <ConfirmInline label="Delete draft" message="Delete this draft?" confirmLabel="Delete" onConfirm={remove} />
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button.jsx";

export function ConfirmInline({
  label,
  message = "Are you sure?",
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "ghost",
  confirmVariant = "danger",
  size = "sm",
  loading = false,
  disabled = false,
  title
}) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef(null);
  const triggerRef = useRef(null);
  const wasAsking = useRef(false);

  // Move focus to "Cancel" when asking (the safe choice), and back to the trigger afterwards
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
    else if (wasAsking.current) triggerRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  if (!asking) {
    return (
      <Button ref={triggerRef} variant={variant} size={size} disabled={disabled} title={title} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="confirm-inline" role="group" aria-label={message}>
      <span>{message}</span>
      <Button
        variant={confirmVariant}
        size="sm"
        loading={loading}
        disabled={disabled}
        title={title}
        onClick={async () => {
          await onConfirm();
          setAsking(false);
        }}
      >
        {confirmLabel}
      </Button>
      <Button ref={cancelRef} variant="ghost" size="sm" onClick={() => setAsking(false)}>
        {cancelLabel}
      </Button>
    </span>
  );
}
