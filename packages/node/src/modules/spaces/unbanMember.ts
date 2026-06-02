import { SublayHttpClient } from "../../core/client";

export interface UnbanMemberProps {
  spaceId: string;
  memberId: string;
}

export interface UnbanMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "active";
  };
}

export async function unbanMember(
  client: SublayHttpClient,
  data: UnbanMemberProps
): Promise<UnbanMemberResponse> {
  const { spaceId, memberId } = data;
  const response = await client.projectInstance.patch<UnbanMemberResponse>(
    `/spaces/${spaceId}/members/${memberId}/unban`
  );
  return response.data;
}
