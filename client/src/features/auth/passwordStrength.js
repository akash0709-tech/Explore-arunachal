// A simple, explainable password strength score (0-4) for the live hint.
// The API only requires 8+ characters with a number; the rest is advice.
export function passwordStrength(password = "") {
  if (password.length === 0) return { score: 0, label: "", tone: "mute", tips: [] };

  const checks = {
    long: password.length >= 8,
    number: /\d/.test(password),
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    veryLong: password.length >= 12
  };

  const tips = [];
  if (!checks.long) tips.push("at least 8 characters");
  if (!checks.number) tips.push("a number");
  if (!checks.mixedCase) tips.push("upper and lower case");
  if (!checks.symbol && !checks.veryLong) tips.push("a symbol or 12+ characters");

  // Not acceptable to the API yet
  if (!checks.long || !checks.number) return { score: 1, label: "Too weak", tone: "bad", tips };

  const extras = [checks.mixedCase, checks.symbol, checks.veryLong].filter(Boolean).length;
  if (extras === 0) return { score: 2, label: "Okay", tone: "warn", tips };
  if (extras === 1) return { score: 3, label: "Good", tone: "ok", tips };
  return { score: 4, label: "Strong", tone: "ok", tips: [] };
}
