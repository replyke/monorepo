import { SublayHttpClient } from "../../core/client";
import { BulkDeleteProps, BulkDeleteResult } from "../../interfaces/Table";

/**
 * DELETE /db/:tableName — bulk delete by id list and/or `filters` predicate
 * (at least one required). Paranoid tables soft-delete unless `force: true`.
 */
export async function bulkDelete(
  client: SublayHttpClient,
  tableName: string,
  params: BulkDeleteProps,
): Promise<BulkDeleteResult> {
  const response = await client.projectInstance.delete<BulkDeleteResult>(
    `/db/${tableName}`,
    { data: params },
  );
  return response.data;
}
