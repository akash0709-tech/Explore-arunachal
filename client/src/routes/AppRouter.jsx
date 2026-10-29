// All routes. Pages are lazy-loaded (each page is its own small download).
// Page changes fade and rise slightly; with "reduce motion" only the fade remains.
import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { AdminLayout } from "../components/layout/AdminLayout.jsx";
import { PageLoader } from "../components/ui/Skeleton.jsx";

const HomePage = lazy(() => import("../pages/HomePage.jsx"));
const PermitPage = lazy(() => import("../pages/PermitPage.jsx"));
const PlanPage = lazy(() => import("../pages/PlanPage.jsx"));
const TripPage = lazy(() => import("../pages/TripPage.jsx"));
const StaysPage = lazy(() => import("../pages/StaysPage.jsx"));
const StayDetailPage = lazy(() => import("../pages/StayDetailPage.jsx"));
const SavedPage = lazy(() => import("../pages/SavedPage.jsx"));
const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("../pages/SignupPage.jsx"));
const HostDashboardPage = lazy(() => import("../pages/HostDashboardPage.jsx"));
const HostRegisterPage = lazy(() => import("../pages/HostRegisterPage.jsx"));
const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage.jsx"));
const AdminApprovalsPage = lazy(() => import("../pages/AdminApprovalsPage.jsx"));
const AdminReviewPage = lazy(() => import("../pages/AdminReviewPage.jsx"));
const AdminHostsPage = lazy(() => import("../pages/AdminHostsPage.jsx"));
const AdminReportsPage = lazy(() => import("../pages/AdminReportsPage.jsx"));
const AdminPermitsPage = lazy(() => import("../pages/AdminPermitsPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));
// Development-only component gallery (never included in a production build). Remove before submission.
const DevUiPage = import.meta.env.DEV ? lazy(() => import("../pages/DevUiPage.jsx")) : null;

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }
};

export default function AppRouter() {
  const location = useLocation();

  // New page: start at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} {...pageMotion}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/permit" element={<PermitPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/stays" element={<StaysPage />} />
            <Route path="/stays/:id" element={<StayDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/trips/:id" element={<TripPage />} />
              <Route path="/saved" element={<SavedPage />} />
            </Route>

            {/* Hosts */}
            <Route element={<ProtectedRoute roles={["host"]} />}>
              <Route path="/host" element={<HostDashboardPage />} />
              <Route path="/host/register/:homestayId?" element={<HostRegisterPage />} />
            </Route>

            {/* Tourism review team */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="approvals" element={<AdminApprovalsPage />} />
                <Route path="approvals/:id" element={<AdminReviewPage />} />
                <Route path="hosts" element={<AdminHostsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="permits" element={<AdminPermitsPage />} />
              </Route>
            </Route>

            {DevUiPage && <Route path="/dev/ui" element={<DevUiPage />} />}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
