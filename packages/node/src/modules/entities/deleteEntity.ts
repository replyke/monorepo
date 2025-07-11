import { ReplykeHttpClient } from "../../core/client";

export interface DeleteEntityProps {
  entityId: string;
}

export async function deleteEntity(
  client: ReplykeHttpClient,
  data: DeleteEntityProps
): Promise<void> {
  const path = `/entities/${data.entityId}`;
  const response = await client.projectInstance.delete<void>(path);
  return response.data;
}
