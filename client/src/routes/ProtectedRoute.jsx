// Guards a page (or a group of pages) by login and role.
//   <Route element={<ProtectedRoute roles={["admin"]} />}> ...admin pages... </Route>
//   - still checking who you are -> loading placeholder
//   - not logged in             -> /login (and back here after logging in)
//   - wrong role                -> home page with a toast
// This is only for a good experience: the API checks roles on every request anyway.
import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useIsPresent } from "framer-motion";
import { PageLoader } from "../components/ui/Skeleton.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { useOfflineTripCache } from "../hooks/useOfflineTripCache.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

const AREA_NAMES = { admin: "the tourism review team", host: "homestay hosts", traveller: "travellers" };

function RedirectWithToast({ to, title, message, id }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    toast({ id, tone: "warn", title, message }); // same id = no duplicate toasts
    navigate(to, { replace: true });
  }, [id, message, navigate, title, to, toast]);
  return null;
}

export function ProtectedRoute({ roles, children }) {
  const { user, isLoading, justLoggedOut } = useAuth();
  const location = useLocation();
  const online = useOnlineStatus();
  const tripId = location.pathname.match(/^\/trips\/([^/]+)$/)?.[1];
  const { available: hasOfflineTrip, isChecking: checkingOfflineTrip } = useOfflineTripCache(tripId);
  // false while this page is fading out after a navigation. A leaving page must never
  // redirect, or it would fight with the page that is coming in (e.g. right after logout).
  const isPresent = useIsPresent();

  if (isLoading) return <PageLoader />;

  const isOfflineTripRoute =
    location.pathname === "/saved" || Boolean(tripId);
  if (!user && !online && isOfflineTripRoute && checkingOfflineTrip) return <PageLoader />;
  if (!user && !online && hasOfflineTrip && isOfflineTripRoute) {
    return children ?? <Outlet />;
  }

  if (!user) {
    // Just logged out: the app is already on its way to the home page
    if (!isPresent || justLoggedOut) return null;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    if (!isPresent) return null;
    return (
      <RedirectWithToast
        id="forbidden"
        to="/"
        title="That page is not available"
        message={`It is only for ${roles.map((r) => AREA_NAMES[r]).join(" or ")}.`}
      />
    );
  }

  return children ?? <Outlet />;
}
