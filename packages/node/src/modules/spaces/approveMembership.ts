import { SublayHttpClient } from "../../core/client";
import { ApproveMemberResponse } from "../../interfaces/Space";

export interface ApproveMembershipProps {
  spaceId: string;
  memberId: string;
}

export async function approveMembership(
  client: SublayHttpClient,
  data: ApproveMembershipProps
): Promise<ApproveMemberResponse> {
  const { spaceId, memberId } = data;
  const response = await client.projectInstance.patch<ApproveMemberResponse>(
    `/spaces/${spaceId}/members/${memberId}/approve`
  );
  return response.data;
}
