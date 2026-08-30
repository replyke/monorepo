import { SublayHttpClient } from "../../core/client";
import { TableRow } from "../../interfaces/Table";

/**
 * GET /db/:tableName/:rowId — a single row (soft-deleted rows 404). Throws on
 * 404 (axios), consistent with the other fetch-one methods in the SDK.
 */
export async function findOne<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  rowId: string,
): Promise<T> {
  const response = await client.projectInstance.get<{ row: T }>(
    `/db/${tableName}/${rowId}`,
  );
  return response.data.row;
}
