import { SublayHttpClient } from "../../core/client";
import { SpaceMembersResponse } from "../../interfaces/SpaceMember";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

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
  const {
    spaceId,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const response = await client.projectInstance.get<SpaceMembersResponse>(
    `/spaces/${spaceId}/members`,
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
