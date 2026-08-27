import { SublayHttpClient } from "../../core/client";

/**
 * DELETE /db/tables/:tableName/columns/:columnName — drop a custom column
 * (service-key only). `tableName` is logical; managed columns are refused.
 */
export async function dropColumn(
  client: SublayHttpClient,
  data: { tableName: string; columnName: string },
): Promise<{ dropped: string }> {
  const response = await client.projectInstance.delete<{ dropped: string }>(
    `/db/tables/${data.tableName}/columns/${data.columnName}`,
  );
  return response.data;
}
