import { useCallback, useEffect, useState } from "react";

/**
 * A seconds countdown, e.g. "Resend code in 23 s".
 *   const { secondsLeft, start } = useCountdown();
 *   start(30);
 */
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const start = useCallback((seconds) => setSecondsLeft(seconds), []);
  return { secondsLeft, isRunning: secondsLeft > 0, start };
}
