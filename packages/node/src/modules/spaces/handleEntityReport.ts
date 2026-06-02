import { SublayHttpClient } from "../../core/client";

export interface HandleEntityReportProps {
  spaceId: string;
  reportId: string;
  action: "resolve" | "dismiss";
}

export interface HandleReportResponse {
  message: string;
}

export async function handleEntityReport(
  client: SublayHttpClient,
  data: HandleEntityReportProps
): Promise<HandleReportResponse> {
  const { spaceId, reportId, action } = data;
  const response = await client.projectInstance.patch<HandleReportResponse>(
    `/spaces/${spaceId}/reports/entity/${reportId}`,
    { action }
  );
  return response.data;
}
