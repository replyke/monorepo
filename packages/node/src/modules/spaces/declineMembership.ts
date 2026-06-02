import { SublayHttpClient } from "../../core/client";
import { DeclineMemberResponse } from "../../interfaces/Space";

export interface DeclineMembershipProps {
  spaceId: string;
  memberId: string;
}

export async function declineMembership(
  client: SublayHttpClient,
  data: DeclineMembershipProps
): Promise<DeclineMemberResponse> {
  const { spaceId, memberId } = data;
  const response = await client.projectInstance.patch<DeclineMemberResponse>(
    `/spaces/${spaceId}/members/${memberId}/decline`
  );
  return response.data;
}
