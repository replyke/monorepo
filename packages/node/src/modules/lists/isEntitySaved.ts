import { ReplykeHttpClient } from "../../core/client";

export interface IsEntitySavedProps {
  userId: string;
  entityId: string;
}

export async function isEntitySaved(
  client: ReplykeHttpClient,
  data: IsEntitySavedProps
): Promise<boolean> {
  const path = `/lists/is-entity-saved`;
  const response = await client.projectInstance.get<boolean>(path, {
    params: data,
  });
  return response.data;
}
