import { SublayHttpClient } from "../../core/client";
import { TableRow } from "../../interfaces/Table";

/** POST /db/:tableName — insert one row. */
export async function create<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  data: Partial<T> | Record<string, unknown>,
): Promise<T> {
  const response = await client.projectInstance.post<{ row: T }>(
    `/db/${tableName}`,
    data,
  );
  return response.data.row;
}
