import { ReplykeHttpClient } from "../../core/client";
import { JoinSpaceResponse } from "../../interfaces/Space";

export interface JoinSpaceProps {
  spaceId: string;
  userId: string;
}

export async function joinSpace(
  client: ReplykeHttpClient,
  data: JoinSpaceProps
): Promise<JoinSpaceResponse> {
  const { spaceId, userId } = data;
  const response = await client.projectInstance.post<JoinSpaceResponse>(
    `/spaces/${spaceId}/join`,
    { userId }
  );
  return response.data;
}
