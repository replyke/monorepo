import { ReplykeHttpClient } from "../../core/client";

export interface KeywordsFilters {
  includes?: string[];
  doesNotInclude?: string[];
}

export interface MetadataFilters {
  includes?: { [key: string]: any };
  doesNotInclude?: { [key: string]: any };
  exists?: string[];
  doesNotExist?: string[];
}

export interface TextFilters {
  hasTitle?: "true" | "false";
  includes?: string | string[];
  doesNotInclude?: string | string[];
}

export interface MediaFilters {
  hasMedia?: "true" | "false";
}

export interface LocationFilters {
  latitude: string;
  longitude: string;
  radius: string;
}

export interface FetchManyEntitiesProps {
  resourceId?: string;
  
  // Sorting & Pagination
  sortBy?: "hot" | "top" | "controversial";
  page?: number;
  limit?: number;

  // Time-based filtering
  timeFrame?: "hour" | "day" | "week" | "month" | "year";

  userId?: string;
  followedOnly?: "true";

  // Keyword filters
  keywordsFilters?: KeywordsFilters;

  // Metadata filters
  metadataFilters?: MetadataFilters;

  // Title filtering
  titleFilters?: TextFilters;

  // Content filtering
  contentFilters?: {
    hasContent?: "true" | "false";
    includes?: string | string[];
    doesNotInclude?: string | string[];
  };

  // Media filtering
  mediaFilters?: MediaFilters;

  // Location filtering
  locationFilters?: LocationFilters;
}

export async function fetchManyEntities(
  client: ReplykeHttpClient,
  data: FetchManyEntitiesProps
): Promise<any> {
  const path = `/entities`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
