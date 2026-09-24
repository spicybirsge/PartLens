export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Keyset (cursor-based) pagination helper.
 *
 * Fetched rows should include one extra row beyond the page size
 * (limit + 1). When `rows.length > limit` there is more data, so the
 * extra row is trimmed and `nextCursor` holds the id of the last
 * returned row — pass it back as `?cursor=` on the next request.
 *
 * Ordering must be `id DESC` (e.g. uuidv7) so that `id < cursor`
 * yields the next page without skips or duplicates.
 */
export const paginate = <T extends { id: string }>(rows: T[], limit: number): PaginatedResult<T> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? last.id : null };
};