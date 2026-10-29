// Entry point: connect to MongoDB first, then start the HTTP server.
// Also closes everything cleanly when the process is stopped (Ctrl+C or a deploy).
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import app from "./app.js";

let server;

async function start() {
  try {
    await connectDB();
  } catch {
    logger.error("Could not connect to MongoDB after several attempts. Check MONGODB_URI in server/.env.");
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    logger.info(`Explore Arunachal API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Most common startup problem: another server (often an old `npm run dev`) already uses the port
  server.on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `Port ${env.port} is already in use. Stop the other process or change PORT in server/.env.`
      );
    } else {
      logger.error(`HTTP server error: ${err.message}`);
    }
    await disconnectDB();
    process.exit(1);
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);

  // If closing takes too long, force exit
  setTimeout(() => {
    logger.error("Forced shutdown after 10s");
    process.exit(1);
  }, 10_000).unref();

  try {
    // Stop accepting new requests, let running ones finish, then close the database
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// A promise rejection nobody caught is a bug: log it and restart cleanly
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
  shutdown("unhandledRejection");
});

start();
