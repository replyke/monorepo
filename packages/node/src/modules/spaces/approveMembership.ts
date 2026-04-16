import { ReplykeHttpClient } from "../../core/client";
import { ApproveMemberResponse } from "../../interfaces/Space";

export interface ApproveMembershipProps {
  spaceId: string;
  memberId: string;
}

export async function approveMembership(
  client: ReplykeHttpClient,
  data: ApproveMembershipProps
): Promise<ApproveMemberResponse> {
  const { spaceId, memberId } = data;
  const response = await client.projectInstance.patch<ApproveMemberResponse>(
    `/spaces/${spaceId}/members/${memberId}/approve`
  );
  return response.data;
}
