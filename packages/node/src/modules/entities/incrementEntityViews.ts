import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface IncrementEntityViewsProps {
  entityId: string;
  count?: number;
}

export async function incrementEntityViews(
  client: SublayHttpClient,
  data: IncrementEntityViewsProps
): Promise<Entity> {
  const { entityId, ...restOfProps } = data;
  const path = `/entities/${entityId}/increment-views`;
  // `count` is read from the query string, not the body — sending it as a body
  // field left the server on its default of 1, silently ignoring the amount.
  const response = await client.projectInstance.patch<Entity>(path, undefined, {
    params: restOfProps,
  });
  return response.data;
}
