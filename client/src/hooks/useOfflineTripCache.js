import { useEffect, useState } from "react";
import { hasCachedTrip, hasCachedTripList } from "../utils/offlineCache.js";

export function useOfflineTripCache(tripId) {
  const [available, setAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    setAvailable(false);
    setIsChecking(true);
    const check = async () => {
      try {
        const cached = tripId ? await hasCachedTrip(tripId) : await hasCachedTripList();
        if (active) setAvailable(cached);
        return cached;
      } finally {
        if (active) setIsChecking(false);
      }
    };

    check().catch((error) => console.error("Could not inspect offline trip cache.", error));
    const timer = window.setInterval(() => {
      attempts += 1;
      check()
        .then((cached) => {
          if (cached || attempts >= 20) window.clearInterval(timer);
        })
        .catch((error) => {
          window.clearInterval(timer);
          console.error("Could not inspect offline trip cache.", error);
        });
    }, 1000);
    const refresh = () => check().catch((error) => console.error("Could not inspect offline trip cache.", error));
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, [tripId]);

  return { available, isChecking };
}
