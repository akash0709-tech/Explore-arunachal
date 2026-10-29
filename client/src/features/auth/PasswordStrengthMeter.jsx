// Live hint under the password field: 4 bars + a word + what would make it stronger.
import { passwordStrength } from "./passwordStrength.js";

export function PasswordStrengthMeter({ password }) {
  const { score, label, tone, tips } = passwordStrength(password);
  if (!password) return null;

  return (
    <div className="strength" data-tone={tone}>
      <div className="strength__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className="strength__bar" data-on={bar <= score} />
        ))}
      </div>
      <p className="text-small" aria-live="polite">
        <strong>{label}</strong>
        {tips.length > 0 && <span className="text-muted"> · Add {tips.join(", ")}</span>}
      </p>
    </div>
  );
}
