import { ReplykeHttpClient } from "../../core/client";
import { SpaceTeamResponse } from "../../interfaces/SpaceMember";

export interface FetchSpaceTeamProps {
  spaceId: string;
}

export async function fetchSpaceTeam(
  client: ReplykeHttpClient,
  data: FetchSpaceTeamProps
): Promise<SpaceTeamResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<SpaceTeamResponse>(
    `/spaces/${spaceId}/team`
  );
  return response.data;
}
