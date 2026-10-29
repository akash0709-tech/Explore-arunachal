// Simple console logger plus the HTTP request logger (morgan).
import morgan from "morgan";

const time = () => new Date().toISOString();

export const logger = {
  info: (msg) => console.log(`[${time()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${time()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${time()}] ERROR ${msg}`)
};

// Short coloured lines in development, standard Apache format in production, silent in tests
export function httpLogger(nodeEnv) {
  if (nodeEnv === "test") return (_req, _res, next) => next();
  return morgan(nodeEnv === "production" ? "combined" : "dev");
}
