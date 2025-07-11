import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface IncrementEntityViewsProps {
  entityId: string;
  count?: number;
}

export async function incrementEntityViews(
  client: ReplykeHttpClient,
  data: IncrementEntityViewsProps
): Promise<Entity> {
  const { entityId, ...restOfProps } = data;
  const path = `/entities/${data.entityId}/increment-views`;
  const response = await client.projectInstance.patch<Entity>(path, restOfProps);
  return response.data;
}
