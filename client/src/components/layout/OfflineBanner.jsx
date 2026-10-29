// Shown under the top bar while the device has no network.
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon.jsx";
import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.div
          className="offline-banner"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <div className="container offline-banner__inner">
            <Icon name="wifiOff" size={18} />
            You&apos;re offline. Saved trips, permit notes and host contacts still open.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
