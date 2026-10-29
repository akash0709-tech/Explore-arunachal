// Helpers for list endpoints: ?page=2&limit=10
//
// Usage in a service:
//   const { page, limit, skip } = getPagination(req.query);
//   const [items, total] = await Promise.all([Model.find().skip(skip).limit(limit), Model.countDocuments()]);
//   return { items, pagination: buildPaginationMeta({ page, limit, total }) };

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export function getPagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}
