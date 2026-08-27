import { SublayHttpClient } from "../../core/client";
import { LeaveSpaceResponse } from "../../interfaces/Space";

export interface LeaveSpaceProps {
  spaceId: string;
  userId: string;
}

export async function leaveSpace(
  client: SublayHttpClient,
  data: LeaveSpaceProps
): Promise<LeaveSpaceResponse> {
  const { spaceId, userId } = data;
  const response = await client.projectInstance.delete<LeaveSpaceResponse>(
    `/spaces/${spaceId}/leave`,
    { params: { userId } }
  );
  return response.data;
}
