import { SublayHttpClient } from "../../core/client";

export interface SetSpaceEntityNsfwProps {
  spaceId: string;
  entityId: string;
  nsfw: boolean;
}

export interface SetSpaceEntityNsfwResponse {
  message: string;
  nsfw: boolean;
}

/**
 * Space-moderator endpoint to set the NSFW flag on an entity within their space
 * (including other users' entities). Near-copy of `moderateSpaceEntity`, but it
 * writes the entity's own `nsfw` (the NSFW axis), not `moderationStatus`.
 */
export async function setSpaceEntityNsfw(
  client: SublayHttpClient,
  data: SetSpaceEntityNsfwProps
): Promise<SetSpaceEntityNsfwResponse> {
  const { spaceId, entityId, ...body } = data;
  const response = await client.projectInstance.patch<SetSpaceEntityNsfwResponse>(
    `/spaces/${spaceId}/entities/${entityId}/nsfw`,
    body
  );
  return response.data;
}
