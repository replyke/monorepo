import { SublayHttpClient } from "../../core/client";
import { TableRow } from "../../interfaces/Table";

/**
 * POST /db/:tableName/:rowId/restore — clear `deletedAt` on a paranoid table.
 */
export async function restore<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  rowId: string,
): Promise<T> {
  const response = await client.projectInstance.post<{ row: T }>(
    `/db/${tableName}/${rowId}/restore`,
  );
  return response.data.row;
}
