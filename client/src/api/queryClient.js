// One shared TanStack Query client. Exported on its own so non-React code
// (the axios interceptor) can clear the cache when a session ends.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // data counts as fresh for 1 minute
      refetchOnWindowFocus: false,
      // Retry network hiccups once, but never 4xx answers (they will not fix themselves)
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status && status < 500) return false;
        return failureCount < 1;
      }
    }
  }
});

export const ME_KEY = ["auth", "me"];

/**
 * Called on logout or when the session cannot be refreshed: forget every
 * server answer that belonged to the user, and mark "who am I?" as nobody.
 * (Removing everything except ME_KEY keeps the auth query's observers attached.)
 */
export function resetSessionData() {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
  queryClient.setQueryData(ME_KEY, null);
}
