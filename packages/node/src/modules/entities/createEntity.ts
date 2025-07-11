import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface CreateEntityProps {
  foreignId?: string;
  sourceId?: string;
  title?: string;
  content?: string;
  attachments?: any[];
  keywords?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
  userId?: string;
}

export async function createEntity(
  client: ReplykeHttpClient,
  data: CreateEntityProps
): Promise<Entity> {
  const path = `/entities`;
  const response = await client.projectInstance.post<any>(path, data);
  return response.data;
}
