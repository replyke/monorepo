import { ReplykeHttpClient } from "../../core/client";
import { JoinSpaceResponse } from "../../interfaces/Space";

export interface JoinSpaceProps {
  spaceId: string;
}

export async function joinSpace(
  client: ReplykeHttpClient,
  data: JoinSpaceProps
): Promise<JoinSpaceResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.post<JoinSpaceResponse>(
    `/spaces/${spaceId}/join`
  );
  return response.data;
}
