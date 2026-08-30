import { SublayHttpClient } from "../../core/client";
import {
  CreateReportResponse,
  ReportReason,
  ReportTargetType,
} from "../../interfaces/Report";

export interface CreateReportProps {
  userId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export async function createReport(
  client: SublayHttpClient,
  data: CreateReportProps
): Promise<CreateReportResponse> {
  const response = await client.projectInstance.post<CreateReportResponse>(
    "/reports",
    data
  );
  return response.data;
}
