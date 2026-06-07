import { SublayHttpClient } from "../../core/client";
import { LeaveSpaceResponse } from "../../interfaces/Space";

export interface LeaveSpaceProps {
  spaceId: string;
}

export async function leaveSpace(
  client: SublayHttpClient,
  data: LeaveSpaceProps
): Promise<LeaveSpaceResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.delete<LeaveSpaceResponse>(
    `/spaces/${spaceId}/leave`
  );
  return response.data;
}
