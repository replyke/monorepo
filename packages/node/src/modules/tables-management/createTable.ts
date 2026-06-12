import { SublayHttpClient } from "../../core/client";
import { CreateTableProps } from "../../interfaces/Table";

/**
 * POST /db/tables — create a custom table (service-key only). The body carries
 * the **logical** name; the server prepends `custom_`.
 */
export async function createTable(
  client: SublayHttpClient,
  data: CreateTableProps,
): Promise<{ table: string }> {
  const response = await client.projectInstance.post<{ table: string }>(
    `/db/tables`,
    data,
  );
  return response.data;
}
