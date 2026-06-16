import { SublayHttpClient } from "../../core/client";
import { SpaceTeamResponse } from "../../interfaces/SpaceMember";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchSpaceTeamProps extends SpaceReputationContextParams {
  spaceId: string;
}

export async function fetchSpaceTeam(
  client: SublayHttpClient,
  data: FetchSpaceTeamProps
): Promise<SpaceTeamResponse> {
  const { spaceId, ...params } = data;
  const response = await client.projectInstance.get<SpaceTeamResponse>(
    `/spaces/${spaceId}/team`,
    { params }
  );
  return response.data;
}
