import { SublayHttpClient } from "../../core/client";
import { CheckMyMembershipResponse } from "../../interfaces/Space";

export interface CheckMyMembershipProps {
  spaceId: string;
  userId: string;
}

export async function checkMyMembership(
  client: SublayHttpClient,
  data: CheckMyMembershipProps
): Promise<CheckMyMembershipResponse> {
  const { spaceId, userId } = data;
  const response = await client.projectInstance.get<CheckMyMembershipResponse>(
    `/spaces/${spaceId}/membership/me`,
    { params: { userId } }
  );
  return response.data;
}
