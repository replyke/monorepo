import { ReplykeHttpClient } from "../../core/client";

export interface BanMemberProps {
  spaceId: string;
  memberId: string;
}

export interface BanMemberResponse {
  message: string;
  membership: {
    id: string;
    status: "banned";
  };
}

export async function banMember(
  client: ReplykeHttpClient,
  data: BanMemberProps
): Promise<BanMemberResponse> {
  const { spaceId, memberId } = data;
  const response = await client.projectInstance.patch<BanMemberResponse>(
    `/spaces/${spaceId}/members/${memberId}/ban`
  );
  return response.data;
}
