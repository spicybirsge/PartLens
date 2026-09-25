/**
 * Escape `%`, `_` and `\` so user input is treated literally
 * inside a SQL LIKE/ILIKE pattern.
 */
export const escapeLikePattern = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
};
