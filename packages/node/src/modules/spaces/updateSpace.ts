import { SublayHttpClient } from "../../core/client";
import {
  Space,
  ReadingPermission,
  PostingPermission,
  SpaceVisibility,
} from "../../interfaces/Space";

export interface UpdateSpaceProps {
  spaceId: string;
  name?: string;
  slug?: string;
  description?: string;
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  visibility?: SpaceVisibility;
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
