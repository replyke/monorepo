import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";

export interface SearchSpacesProps {
  query: string;
  limit?: number;
}

export interface SpaceSearchResult {
  similarity: number;
  record: Space;
}

export async function searchSpaces(
  client: SublayHttpClient,
  data: SearchSpacesProps
): Promise<SpaceSearchResult[]> {
  const response = await client.projectInstance.post<SpaceSearchResult[]>(
    "/search/spaces",
    data
  );
  return response.data;
}
