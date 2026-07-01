import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface MatchUsersProps {
  mode: "passive" | "directed";
  query?: string;
  limit?: number;
  spaceId?: string;
  includeChildSpaces?: boolean;
  includeSampleContent?: boolean;
  excludeSelf?: boolean;
}

export interface MatchFacetRef {
  id: string;
  hotness: number;
}

export interface SampleContent {
  sourceType: "entity" | "comment" | "message";
  recordId: string;
  content: string;
  similarity: number;
}

export interface MatchedFacet {
  similarity: number;
  askerFacet?: MatchFacetRef;
  candidateFacet: MatchFacetRef;
  sampleContent?: SampleContent[];
}

export interface UserMatchResult {
  user: User;
  score: number;
  matchedFacets: MatchedFacet[];
}

export interface MatchUsersResponse {
  results: UserMatchResult[];
}

export async function matchUsers(
  client: SublayHttpClient,
  data: MatchUsersProps
): Promise<MatchUsersResponse> {
  const response = await client.projectInstance.post<MatchUsersResponse>(
    "/match/users",
    data
  );
  return response.data;
}
