import { SublayHttpClient } from "../../core/client";
import { Report } from "../../interfaces/Report";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchModeratedReportsProps {
  spaceId?: string;
  page?: number;
  limit?: number;
}

export async function fetchModeratedReports(
  client: SublayHttpClient,
  data: FetchModeratedReportsProps
): Promise<PaginatedResponse<Report>> {
  const response = await client.projectInstance.get<PaginatedResponse<Report>>(
    "/reports/moderated",
    { params: data }
  );
  return response.data;
}
