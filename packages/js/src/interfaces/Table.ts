import { SublayHttpClient } from "../core/client";
import { PaginatedResponse } from "./IPaginatedResponse";

/**
 * Custom-table types for the `/db` surface (row ops only — the js-sdk holds no
 * service key, so it carries no table-management/DDL surface).
 *
 * Names mirror the server's `/db` contract exactly.
 */

export type DbFilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "like"
  | "isNull";

export interface DbFilter {
  column: string;
  operator: DbFilterOperator;
  value?: unknown;
}

export interface TableQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** AND-combined filter clauses. Serialized to a JSON query param. */
  filters?: DbFilter[];
  /** Surface soft-deleted rows on a paranoid table. */
  includeDeleted?: boolean;
}

/** Shape every custom-table row shares (managed columns). */
export interface TableRow {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  [column: string]: unknown;
}

export interface DeleteResult {
  deleted: boolean;
  soft: boolean;
}

export interface BulkDeleteResult {
  deletedCount: number;
  soft: boolean;
}

export interface BulkDeleteProps {
  rowIds?: string[];
  filters?: DbFilter[];
  force?: boolean;
}

/**
 * Per-table row-operations accessor returned by `client.table<T>(name)`.
 * The actor is derived server-side from the user token (js-sdk Rule A) — no
 * actor params here. No DDL surface (no service key).
 */
export interface TableAccessor<T = TableRow> {
  find(query?: TableQuery): Promise<PaginatedResponse<T>>;
  findOne(rowId: string): Promise<T>;
  create(data: Partial<T> | Record<string, unknown>): Promise<T>;
  bulkCreate(rows: Array<Partial<T> | Record<string, unknown>>): Promise<T[]>;
  update(rowId: string, data: Partial<T> | Record<string, unknown>): Promise<T>;
  delete(rowId: string, opts?: { force?: boolean }): Promise<DeleteResult>;
  bulkDelete(params: BulkDeleteProps): Promise<BulkDeleteResult>;
  restore(rowId: string): Promise<T>;
}

export type TableAccessorFactory = <T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
) => TableAccessor<T>;
