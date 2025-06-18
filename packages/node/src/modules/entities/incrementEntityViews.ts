import { ReplykeHttpClient } from "../../core/client";

export interface IncrementEntityViewsProps {
  entityId: string;
  count?: number;
}

export async function incrementEntityViews(
  client: ReplykeHttpClient,
  data: IncrementEntityViewsProps
): Promise<any> {
  const { entityId, ...restOfProps } = data;
  const path = `/entities/${data.entityId}/increment-views`;
  const response = await client.projectInstance.patch<any>(path, restOfProps);
  return response.data;
}
