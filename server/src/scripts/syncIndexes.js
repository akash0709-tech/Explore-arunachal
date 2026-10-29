// Makes the indexes in MongoDB match the models exactly (adds missing ones, drops
// ones the models no longer define, and rebuilds changed ones such as a new TTL).
// Run after changing an index in a model:  npm run db:indexes
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../utils/logger.js";
import * as models from "../models/index.js";

async function run() {
  await connectDB();
  for (const [name, Model] of Object.entries(models)) {
    const dropped = await Model.syncIndexes();
    logger.info(
      `${name}: indexes in sync${dropped.length ? ` (rebuilt/dropped: ${dropped.join(", ")})` : ""}`
    );
  }
  await disconnectDB();
}

run().catch(async (err) => {
  logger.error(`Index sync failed: ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
