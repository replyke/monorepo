import { SublayHttpClient } from "../../core/client";
import { HandleReportResponse } from "./handleEntityReport";

export type CommentReportAction = "remove-comment" | "ban-user" | "dismiss";

export interface HandleCommentReportProps {
  spaceId: string;
  reportId: string;
  commentId: string;
  actions: CommentReportAction[];
  summary?: string;
  reason?: string;
  userId?: string;
}

export async function handleCommentReport(
  client: SublayHttpClient,
  data: HandleCommentReportProps
): Promise<HandleReportResponse> {
  const { spaceId, reportId, ...body } = data;
  const response = await client.projectInstance.patch<HandleReportResponse>(
    `/spaces/${spaceId}/reports/comment/${reportId}`,
    body
  );
  return response.data;
}
