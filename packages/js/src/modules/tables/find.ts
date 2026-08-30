import { SublayHttpClient } from "../../core/client";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { TableQuery, TableRow } from "../../interfaces/Table";

/**
 * GET /db/:tableName — paginated rows with the `{ data, pagination }` envelope.
 * `filters` is serialized to a JSON query param; `includeDeleted` to "true"/"false".
 */
export async function find<T = TableRow>(
  client: SublayHttpClient,
  tableName: string,
  query: TableQuery = {},
): Promise<PaginatedResponse<T>> {
  const { filters, includeDeleted, ...rest } = query;
  const params: Record<string, unknown> = { ...rest };
  if (filters && filters.length > 0) params.filters = JSON.stringify(filters);
  if (includeDeleted !== undefined)
    params.includeDeleted = includeDeleted ? "true" : "false";

  const response = await client.projectInstance.get<PaginatedResponse<T>>(
    `/db/${tableName}`,
    { params },
  );
  return response.data;
}
