import { ReplykeHttpClient } from "../../core/client";
import {
  CreateReportResponse,
  ReportTargetType,
} from "../../interfaces/Report";

export interface CreateReportProps {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  spaceId?: string;
}

export async function createReport(
  client: ReplykeHttpClient,
  data: CreateReportProps
): Promise<CreateReportResponse> {
  const response = await client.projectInstance.post<CreateReportResponse>(
    "/reports",
    data
  );
  return response.data;
}
