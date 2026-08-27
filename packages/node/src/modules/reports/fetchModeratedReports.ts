import { SublayHttpClient } from "../../core/client";
import { Report, ReportStatus, ReportTargetType } from "../../interfaces/Report";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

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
  const { spaceReputation, spaceReputationId, spaceReputationDescendants, ...rest } =
    data;
  const response = await client.projectInstance.get<PaginatedResponse<Report>>(
    "/reports/moderated",
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
