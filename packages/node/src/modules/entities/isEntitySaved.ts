import { SublayHttpClient } from "../../core/client";

export interface IsEntitySavedProps {
  entityId: string;
  userId: string;
}

export interface IsEntitySavedResponse {
  isSaved: boolean;
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
