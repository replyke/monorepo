import { ReplykeHttpClient } from "../../core/client";
import { UserSpacesResponse } from "../../interfaces/Space";

export interface FetchUserSpacesProps {
  userId?: string;
  page?: number;
  limit?: number;
}

export async function fetchUserSpaces(
  client: ReplykeHttpClient,
  data: FetchUserSpacesProps
): Promise<UserSpacesResponse> {
  const response = await client.projectInstance.get<UserSpacesResponse>(
    "/spaces/user-spaces",
    { params: data }
  );
  return response.data;
}
