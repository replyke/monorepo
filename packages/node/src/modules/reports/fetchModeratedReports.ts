import { SublayHttpClient } from "../../core/client";
import { Report, ReportStatus, ReportTargetType } from "../../interfaces/Report";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchModeratedReportsProps
  extends SpaceReputationContextParams {
  userId: string;
  spaceId?: string;
  targetType?: ReportTargetType;
  status?: ReportStatus;
  sortBy?: "new" | "old";
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
