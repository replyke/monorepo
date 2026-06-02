import { SublayHttpClient } from "../../core/client";
import { DeleteSpaceResponse } from "../../interfaces/Space";

export interface DeleteSpaceProps {
  spaceId: string;
}

export async function deleteSpace(
  client: SublayHttpClient,
  data: DeleteSpaceProps
): Promise<DeleteSpaceResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.delete<DeleteSpaceResponse>(
    `/spaces/${spaceId}`
  );
  return response.data;
}
