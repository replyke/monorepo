import { ReplykeHttpClient } from "../../core/client";

export interface UpdateEntityProps {
  entityId: string;
  count?: number;
}

export async function updateEntity(
  client: ReplykeHttpClient,
  data: UpdateEntityProps
): Promise<any> {
  const { entityId, ...restOfProps } = data;
  const path = `/entities/${data.entityId}`;
  const response = await client.projectInstance.patch<any>(path, restOfProps);
  return response.data;
}
