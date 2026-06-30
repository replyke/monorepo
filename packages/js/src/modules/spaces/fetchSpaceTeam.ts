import { SublayHttpClient } from "../../core/client";
import { SpaceTeamResponse } from "../../interfaces/SpaceMember";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface FetchSpaceTeamProps extends SpaceReputationContextParams {
  spaceId: string;
}

export async function fetchSpaceTeam(
  client: SublayHttpClient,
  data: FetchSpaceTeamProps
): Promise<SpaceTeamResponse> {
  const {
    spaceId,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const params = {
    ...rest,
    ...buildSpaceReputationParams({
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }),
  };
  const response = await client.projectInstance.get<SpaceTeamResponse>(
    `/spaces/${spaceId}/team`,
    { params }
  );
  return response.data;
}
