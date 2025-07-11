import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface UpdateEntityProps {
  entityId: string;
  title?: string;
  content?: string;
  attachments?: Record<string, any>[];
  keywords?: string[];
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  metadata?: Record<string, any>;
  mentions?: {
    id: string;
    username: string;
  }[];
}

export async function updateEntity(
  client: ReplykeHttpClient,
  data: UpdateEntityProps
): Promise<Entity> {
  const { entityId, ...restOfProps } = data;
  const path = `/entities/${data.entityId}`;
  const response = await client.projectInstance.patch<any>(path, restOfProps);
  return response.data;
}
