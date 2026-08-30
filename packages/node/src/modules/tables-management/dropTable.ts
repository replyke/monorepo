import { SublayHttpClient } from "../../core/client";

/** DELETE /db/tables/:tableName — drop a custom table (service-key only). */
export async function dropTable(
  client: SublayHttpClient,
  data: { tableName: string },
): Promise<{ dropped: string }> {
  const response = await client.projectInstance.delete<{ dropped: string }>(
    `/db/tables/${data.tableName}`,
  );
  return response.data;
}
