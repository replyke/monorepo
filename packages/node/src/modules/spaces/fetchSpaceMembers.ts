import { SublayHttpClient } from "../../core/client";
import { SpaceMembersResponse } from "../../interfaces/SpaceMember";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchSpaceMembersProps extends SpaceReputationContextParams {
  spaceId: string;
  page?: number;
  limit?: number;
  role?: "admin" | "moderator" | "member";
  status?: "pending" | "active" | "banned" | "rejected";
}

export async function fetchSpaceMembers(
  client: SublayHttpClient,
  data: FetchSpaceMembersProps
): Promise<SpaceMembersResponse> {
  const { spaceId, ...params } = data;
  const response = await client.projectInstance.get<SpaceMembersResponse>(
    `/spaces/${spaceId}/members`,
    { params }
  );
  return response.data;
}
