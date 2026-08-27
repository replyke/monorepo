import { SublayHttpClient } from "../../core/client";
import { CustomColumnType } from "../../interfaces/Table";

export interface AddColumnProps {
  tableName: string;
  columnName: string;
  dataType: CustomColumnType;
  nullable: boolean;
  defaultValue?: string | null;
}

/**
 * POST /db/tables/:tableName/columns — add a column to a custom table
 * (service-key only). `tableName` is logical.
 */
export async function addColumn(
  client: SublayHttpClient,
  data: AddColumnProps,
): Promise<{ added: string }> {
  const { tableName, ...column } = data;
  const response = await client.projectInstance.post<{ added: string }>(
    `/db/tables/${tableName}/columns`,
    column,
  );
  return response.data;
}
