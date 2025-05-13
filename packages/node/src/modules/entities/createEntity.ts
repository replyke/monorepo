import { ReplykeHttpClient } from "../../core/client";

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


// TODO: Replace "any" with Entity once we have types here too
export async function createEntity(
  client: ReplykeHttpClient,
  data: CreateEntityProps
): Promise<any> {
  const path = `/entities`; // assuming client handles prefix like /{projectId}
  const response = await client.projectInstance.post<any>(path, data);
  return response.data;
}
