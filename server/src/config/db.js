// Connects to MongoDB with retries and logs connection events.
import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Turn mongoose's numeric readyState into a word for the health check
const STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
export const getDbState = () => STATES[mongoose.connection.readyState] ?? "unknown";

// Log what happens to the connection after the first successful connect
let listenersAdded = false;
function addConnectionListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => logger.error(`MongoDB error: ${err.message}`));
}

export async function connectDB() {
  // Some networks cannot resolve Atlas "mongodb+srv" addresses; DNS_SERVERS works around that
  if (env.dnsServers.length > 0) dns.setServers(env.dnsServers);

  mongoose.set("strictQuery", true);
  addConnectionListeners();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
      logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
      return mongoose.connection;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await wait(RETRY_DELAY_MS);
    }
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
}
