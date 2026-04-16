import { ReplykeHttpClient } from "../../core/client";
import { HandleReportResponse } from "./handleEntityReport";

export interface HandleCommentReportProps {
  spaceId: string;
  reportId: string;
  action: "resolve" | "dismiss";
}

export async function handleCommentReport(
  client: ReplykeHttpClient,
  data: HandleCommentReportProps
): Promise<HandleReportResponse> {
  const { spaceId, reportId, action } = data;
  const response = await client.projectInstance.patch<HandleReportResponse>(
    `/spaces/${spaceId}/reports/comment/${reportId}`,
    { action }
  );
  return response.data;
}
