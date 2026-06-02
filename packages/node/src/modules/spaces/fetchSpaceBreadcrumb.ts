import { SublayHttpClient } from "../../core/client";
import { SpaceBreadcrumb } from "../../interfaces/Space";

export interface FetchSpaceBreadcrumbProps {
  spaceId: string;
}

export async function fetchSpaceBreadcrumb(
  client: SublayHttpClient,
  data: FetchSpaceBreadcrumbProps
): Promise<SpaceBreadcrumb> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<SpaceBreadcrumb>(
    `/spaces/${spaceId}/breadcrumb`
  );
  return response.data;
}
