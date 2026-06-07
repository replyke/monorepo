import { SublayHttpClient } from "../../core/client";

export interface IsEntitySavedProps {
  entityId: string;
}

export interface IsEntitySavedResponse {
  saved: boolean;
  collections: { id: string; name: string }[];
}

export async function isEntitySaved(
  client: SublayHttpClient,
  data: IsEntitySavedProps
): Promise<IsEntitySavedResponse> {
  const response = await client.projectInstance.get<IsEntitySavedResponse>(
    "/entities/is-entity-saved",
    { params: data }
  );
  return response.data;
}
