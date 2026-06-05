import { SublayHttpClient } from "../../core/client";
import { UserSpacesResponse } from "../../interfaces/Space";

export interface FetchUserSpacesProps {
  userId: string;
  page?: number;
  limit?: number;
  sortBy?: "alphabetical" | "newest" | "members";
  include?: string;
  role?: string; // single role or comma-separated, e.g. "admin,moderator"
  all?: "true" | "false";
}

export async function fetchUserSpaces(
  client: SublayHttpClient,
  data: FetchUserSpacesProps
): Promise<UserSpacesResponse> {
  const response = await client.projectInstance.get<UserSpacesResponse>(
    "/spaces/user-spaces",
    { params: data }
  );
  return response.data;
}
