import { ReplykeHttpClient } from "../../core/client";

export interface CreateEntityInput {
  referenceId?: string;
  resource?: string;
  title?: string;
  content?: string;
  media?: any[];
  keywords?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
  userId: string;
}


// TODO: Replace "any" with Entity once we have types here too
export async function createEntity(
  client: ReplykeHttpClient,
  data: CreateEntityInput
): Promise<any> {
  const path = `/entities`; // assuming client handles prefix like /{projectId}
  const response = await client.instance.post<any>(path, data);
  return response.data;
}
