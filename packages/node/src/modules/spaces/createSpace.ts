import { SublayHttpClient } from "../../core/client";
import {
  Space,
  ReadingPermission,
  PostingPermission,
  SpaceVisibility,
} from "../../interfaces/Space";

export interface CreateSpaceProps {
  userId: string;
  name: string;
  slug?: string;
  description?: string;
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  visibility?: SpaceVisibility;
  requireJoinApproval?: boolean;
  parentSpaceId?: string;
  metadata?: Record<string, any>;
  nsfw?: boolean;
}

export async function createSpace(
  client: SublayHttpClient,
  data: CreateSpaceProps
): Promise<Space> {
  const response = await client.projectInstance.post<Space>("/spaces", data);
  return response.data;
}
