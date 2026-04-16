import { ReplykeHttpClient } from "../../core/client";
import { CheckMyMembershipResponse } from "../../interfaces/Space";

export interface CheckMyMembershipProps {
  spaceId: string;
}

export async function checkMyMembership(
  client: ReplykeHttpClient,
  data: CheckMyMembershipProps
): Promise<CheckMyMembershipResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<CheckMyMembershipResponse>(
    `/spaces/${spaceId}/membership/me`
  );
  return response.data;
}
