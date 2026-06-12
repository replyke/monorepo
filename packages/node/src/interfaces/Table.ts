import { SublayHttpClient } from "../core/client";
import { PaginatedResponse } from "./IPaginatedResponse";

/**
 * Custom-table types for the `/db` surface.
 *
 * Names mirror the server's `/db` contract exactly (page/limit/sortBy/sortDir/
 * filters/includeDeleted; the 10 filter operators; the 9 column types).
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

export type CustomColumnType =
  | "text"
  | "integer"
  | "float"
  | "boolean"
  | "timestamp"
  | "json"
  | "decimal"
  | "date"
  | "uuid";

export interface CustomColumnDefinition {
  columnName: string;
  dataType: CustomColumnType;
  nullable: boolean;
  defaultValue?: string | null;
}

export interface CreateTableProps {
  /** Logical name — the server prepends `custom_`. */
  tableName: string;
  columns: CustomColumnDefinition[];
  /** Emit createdAt/updatedAt. Default true. */
  timestamps?: boolean;
  /** Emit deletedAt (soft delete). Requires timestamps. Default false. */
  paranoid?: boolean;
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
 * A net-new callable-accessor pattern (the flat `bindModule` namespace can't
 * capture a per-call table name) — see `createTableAccessor`.
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

/** Factory type for the accessor (closes over client + table name). */
export type TableAccessorFactory = <T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
) => TableAccessor<T>;
