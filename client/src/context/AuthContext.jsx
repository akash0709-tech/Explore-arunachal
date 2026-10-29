// Who is logged in. On start we ask the API "who am I?" (GET /auth/me); the answer
// lives in the React Query cache, never in localStorage. The httpOnly cookies are
// handled by the browser and the API.
//
//   const { user, role, isLoading, login, logout, signup } = useAuth();
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "./contexts.js";
import * as authApi from "../api/auth.js";
import { ME_KEY, resetSessionData } from "../api/queryClient.js";
import { onSessionExpired } from "../api/sessionEvents.js";
import { useToast } from "../hooks/useToast.js";
import { clearPrivateTripCaches } from "../utils/offlineCache.js";

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Remember the current page so we can come back to it after logging in again
  const locationRef = useRef(location);
  locationRef.current = location;

  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me, // returns null for guests
    staleTime: 5 * 60 * 1000,
    retry: false,
    networkMode: "always"
  });
  const user = meQuery.data ?? null;

  // True from "Log out" until the next page change. Protected pages use it to wait for the
  // trip home instead of sending the user to /login because the user just disappeared.
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  useEffect(() => setJustLoggedOut(false), [location.pathname]);

  // The axios interceptor could not refresh the session: back to /login
  useEffect(
    () =>
      onSessionExpired(() => {
        toast({
          id: "session-expired",
          tone: "warn",
          title: "Please log in again",
          message: "Your session has ended."
        });
        navigate("/login", { state: { from: locationRef.current } });
      }),
    [navigate, toast]
  );

  const login = useCallback(
    async (credentials) => {
      await clearPrivateTripCaches();
      const loggedIn = await authApi.login(credentials);
      queryClient.setQueryData(ME_KEY, loggedIn);
      return loggedIn;
    },
    [queryClient]
  );

  const signup = useCallback(
    async (details) => {
      await clearPrivateTripCaches();
      const created = await authApi.signup(details);
      queryClient.setQueryData(ME_KEY, created);
      return created;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      try {
        await clearPrivateTripCaches();
      } catch (error) {
        toast({
          tone: "bad",
          title: "Could not clear offline trip copies",
          message: error.message
        });
      } finally {
        setJustLoggedOut(true);
        resetSessionData(); // forget everything that belonged to this user
        navigate("/");
        toast({ title: "Logged out", tone: "mute" });
      }
    }
  }, [navigate, toast]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isLoggedIn: Boolean(user),
      isLoading: meQuery.isLoading,
      justLoggedOut,
      login,
      signup,
      logout,
      refreshUser: meQuery.refetch
    }),
    [user, meQuery.isLoading, meQuery.refetch, justLoggedOut, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
