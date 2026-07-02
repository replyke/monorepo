/**
 * Shared optional params for text-searching a list of users
 * (followers / following / connections).
 *
 * - `query` — free-text search term. When omitted, no filtering is applied.
 * - `searchFields` — narrows which user field the term matches against. When
 *   omitted, the term matches either `username` OR `name` (case-insensitive
 *   substring). `"username"` / `"name"` restrict the match to that one field.
 */
export interface UserSearchParams {
  query?: string;
  searchFields?: "username" | "name";
}
