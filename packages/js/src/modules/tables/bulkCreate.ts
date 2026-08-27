import { SublayHttpClient } from "../../core/client";
import { TableRow } from "../../interfaces/Table";

/** POST /db/:tableName/bulk — insert many rows (capped at 100 server-side). */
export async function bulkCreate<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  rows: Array<Partial<T> | Record<string, unknown>>,
): Promise<T[]> {
  const response = await client.projectInstance.post<{ rows: T[] }>(
    `/db/${tableName}/bulk`,
    { rows },
  );
  return response.data.rows;
}
