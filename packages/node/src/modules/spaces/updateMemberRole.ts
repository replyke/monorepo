import { SublayHttpClient } from "../../core/client";
import { UpdateMemberRoleResponse, SpaceMemberRole } from "../../interfaces/Space";

export interface UpdateMemberRoleProps {
  spaceId: string;
  memberId: string;
  role: SpaceMemberRole;
}

export async function updateMemberRole(
  client: SublayHttpClient,
  data: UpdateMemberRoleProps
): Promise<UpdateMemberRoleResponse> {
  const { spaceId, memberId, role } = data;
  const response = await client.projectInstance.patch<UpdateMemberRoleResponse>(
    `/spaces/${spaceId}/members/${memberId}/role`,
    { role }
  );
  return response.data;
}
