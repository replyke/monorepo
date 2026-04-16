import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface PublishDraftProps {
  entityId: string;
}

export async function publishDraft(
  client: ReplykeHttpClient,
  data: PublishDraftProps
): Promise<Entity> {
  const { entityId } = data;
  const response = await client.projectInstance.patch<Entity>(
    `/entities/${entityId}/publish`
  );
  return response.data;
}
