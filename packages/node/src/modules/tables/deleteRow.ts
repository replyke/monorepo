import { SublayHttpClient } from "../../core/client";
import { DeleteResult } from "../../interfaces/Table";

/**
 * DELETE /db/:tableName/:rowId — soft-delete on a paranoid table by default;
 * `force: true` hard-deletes.
 */
export async function deleteRow(
  client: SublayHttpClient,
  tableName: string,
  rowId: string,
  opts: { force?: boolean } = {},
): Promise<DeleteResult> {
  const response = await client.projectInstance.delete<DeleteResult>(
    `/db/${tableName}/${rowId}`,
    { params: opts.force ? { force: "true" } : {} },
  );
  return response.data;
}
