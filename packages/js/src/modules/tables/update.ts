import { SublayHttpClient } from "../../core/client";
import { TableRow } from "../../interfaces/Table";

/** PATCH /db/:tableName/:rowId — update a row (server bumps updatedAt). */
export async function update<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  rowId: string,
  data: Partial<T> | Record<string, unknown>,
): Promise<T> {
  const response = await client.projectInstance.patch<{ row: T }>(
    `/db/${tableName}/${rowId}`,
    data,
  );
  return response.data.row;
}
