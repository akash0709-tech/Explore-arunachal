// Asks the API which permits apply. The selections are debounced, so tapping several
// chips quickly sends one request, and the previous answer stays on screen meanwhile.
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { checkPermits } from "../../api/permits.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";

export function usePermitCheck({ citizen, slugs }) {
  // A plain string key (sorted, so "tawang,dirang" = "dirang,tawang"). Debouncing a string,
  // not a new object each render, keeps the debounce from restarting forever.
  const key = `${citizen}|${[...slugs].sort().join(",")}`;
  const debouncedKey = useDebouncedValue(key, 300);
  const [debouncedCitizen, debouncedList] = debouncedKey.split("|");
  const debouncedSlugs = debouncedList ? debouncedList.split(",") : [];

  return useQuery({
    queryKey: ["permits", "check", debouncedKey],
    queryFn: () => checkPermits({ citizen: debouncedCitizen, destinations: debouncedSlugs }),
    enabled: debouncedSlugs.length > 0,
    networkMode: "always",
    retry: false,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000
  });
}
