import { SublayHttpClient } from "../../core/client";
import { Space, ReadingPermission, PostingPermission } from "../../interfaces/Space";

export interface UpdateSpaceProps {
  spaceId: string;
  name?: string;
  slug?: string;
  description?: string;
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  requireJoinApproval?: boolean;
  metadata?: Record<string, any>;
}

export async function updateSpace(
  client: SublayHttpClient,
  data: UpdateSpaceProps
): Promise<Space> {
  const { spaceId, ...body } = data;
  const response = await client.projectInstance.patch<Space>(
    `/spaces/${spaceId}`,
    body
  );
  return response.data;
}
