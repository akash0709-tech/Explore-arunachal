// The page frame: top bar, offline banner, the current page, and the footer.
import { MotionConfig } from "framer-motion";
import { TopBar } from "./components/layout/TopBar.jsx";
import { OfflineBanner } from "./components/layout/OfflineBanner.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import AppRouter from "./routes/AppRouter.jsx";

export default function App() {
  return (
    // reducedMotion="user": if the device asks for less motion, Framer Motion skips movement
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar />
      <OfflineBanner />
      <main id="main" className="app-main" tabIndex={-1}>
        <AppRouter />
      </main>
      <Footer />
    </MotionConfig>
  );
}
