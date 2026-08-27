import { SublayHttpClient } from "../../core/client";

export type EntityReportAction = "remove-entity" | "ban-user" | "dismiss";

export interface HandleEntityReportProps {
  spaceId: string;
  reportId: string;
  entityId: string;
  actions: EntityReportAction[];
  summary?: string;
  reason?: string;
  userId?: string;
}

export interface HandleReportResponse {
  message: string;
}

export async function handleEntityReport(
  client: SublayHttpClient,
  data: HandleEntityReportProps
): Promise<HandleReportResponse> {
  const { spaceId, reportId, ...body } = data;
  const response = await client.projectInstance.patch<HandleReportResponse>(
    `/spaces/${spaceId}/reports/entity/${reportId}`,
    body
  );
  return response.data;
}
