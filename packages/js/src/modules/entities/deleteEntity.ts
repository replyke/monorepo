import { ReplykeHttpClient } from "../../core/client";

export interface DeleteEntityProps {
  entityId: string;
}

export async function deleteEntity(
  client: ReplykeHttpClient,
  data: DeleteEntityProps
): Promise<any> {
  const path = `/entities/${data.entityId}`;
  const response = await client.instance.delete<any>(path);
  return response.data;
}
