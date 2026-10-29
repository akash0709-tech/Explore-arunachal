// Makes user text safe to use inside a MongoDB $regex search.
// Without it, a search for "a.*" or "(" would be treated as a pattern or crash.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
