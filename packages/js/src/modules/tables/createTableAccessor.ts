import { SublayHttpClient } from "../../core/client";
import { TableAccessor, TableRow } from "../../interfaces/Table";

import { bulkCreate } from "./bulkCreate";
import { bulkDelete } from "./bulkDelete";
import { create } from "./create";
import { deleteRow } from "./deleteRow";
import { find } from "./find";
import { findOne } from "./findOne";
import { restore } from "./restore";
import { update } from "./update";

/**
 * Build the per-table row-operations accessor returned by
 * `client.table<T>(name)`. A thin factory that closes over the HTTP client and
 * the table name — the one structural novelty over the flat `bindModule`
 * namespace, which can't capture a per-call table name.
 */
export function createTableAccessor<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
): TableAccessor<T> {
  return {
    find: (query) => find<T>(client, tableName, query),
    findOne: (rowId) => findOne<T>(client, tableName, rowId),
    create: (data) => create<T>(client, tableName, data),
    bulkCreate: (rows) => bulkCreate<T>(client, tableName, rows),
    update: (rowId, data) => update<T>(client, tableName, rowId, data),
    delete: (rowId, opts) => deleteRow(client, tableName, rowId, opts),
    bulkDelete: (params) => bulkDelete(client, tableName, params),
    restore: (rowId) => restore<T>(client, tableName, rowId),
  };
}
