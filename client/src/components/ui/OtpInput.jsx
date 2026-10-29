// Six boxes for a one-time code.
//   - typing a digit moves to the next box
//   - pasting "123456" (or "123 456") fills every box
//   - Backspace on an empty box goes back to the previous one; arrow keys move
//   <OtpInput label="Email code" value={code} onChange={setCode} onComplete={verify} error={error} />
import { useId, useRef } from "react";
import { Icon } from "./Icon.jsx";

export function OtpInput({
  label = "Verification code",
  length = 6,
  value = "",
  onChange,
  onComplete,
  error,
  disabled
}) {
  const labelId = useId();
  const errorId = useId();
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const update = (nextDigits) => {
    const next = nextDigits.join("").slice(0, length);
    onChange(next);
    if (next.length === length && !nextDigits.includes("")) onComplete?.(next);
  };
  const focus = (index) => refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const onInput = (index, raw) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    const next = [...digits];
    // Some phones put the whole code into one box: spread it out
    typed.split("").forEach((digit, offset) => {
      if (index + offset < length) next[index + offset] = digit;
    });
    update(next);
    focus(index + typed.length);
  };

  const onKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        focus(index - 1);
      }
      update(next);
    }
    if (event.key === "ArrowLeft") focus(index - 1);
    if (event.key === "ArrowRight") focus(index + 1);
  };

  const onPaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    update(Array.from({ length }, (_, i) => pasted[i] ?? ""));
    focus(pasted.length);
  };

  return (
    <div className="field">
      <span id={labelId} className="field__label">
        {label}
      </span>
      <div
        className="otp"
        role="group"
        aria-labelledby={labelId}
        data-invalid={Boolean(error)}
        onPaste={onPaste}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (refs.current[index] = el)}
            className="otp__box"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onInput(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
