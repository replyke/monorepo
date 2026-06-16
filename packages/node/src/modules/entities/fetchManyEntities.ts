import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface KeywordsFilters {
  includes?: string[];
  doesNotInclude?: string[];
}

export interface MetadataFilters {
  includes?: { [key: string]: any };
  includesAny?: { [key: string]: any }[];
  doesNotInclude?: { [key: string]: any };
  exists?: string[];
  doesNotExist?: string[];
}

export interface TextFilters {
  hasTitle?: "true" | "false";
  includes?: string | string[];
  doesNotInclude?: string | string[];
}

export interface AttachmentsFilters {
  hasAttachments?: "true" | "false";
}

export interface LocationFilters {
  latitude: string;
  longitude: string;
  radius: string;
}

export interface FetchManyEntitiesProps extends SpaceReputationContextParams {
  sourceId?: string;
  spaceId?: string;

  // Sorting & Pagination
  // `metadata.<prop>` is also accepted by the server for metadata-based sorting.
  sortBy?: "new" | "hot" | "top" | "controversial" | (string & {});
  sortDir?: "asc" | "desc";
  sortType?: "auto" | "numeric" | "text" | "boolean" | "timestamp";
  sortByReaction?:
    | "upvote"
    | "downvote"
    | "like"
    | "love"
    | "wow"
    | "sad"
    | "angry"
    | "funny";
  page?: number;
  limit?: number;

  // Optional associations to expand
  include?: string;

  // Time-based filtering
  timeFrame?: "hour" | "day" | "week" | "month" | "year";

  userId?: string;
  followedOnly?: "true" | "false";

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

  // Attachments filtering
  attachmentsFilters?: AttachmentsFilters;

  // Location filtering
  locationFilters?: LocationFilters;
}

export async function fetchManyEntities(
  client: SublayHttpClient,
  data: FetchManyEntitiesProps
): Promise<PaginatedResponse<Entity>> {
  const path = `/entities`;
  const response = await client.projectInstance.get<PaginatedResponse<Entity>>(
    path,
    {
      params: data,
    }
  );
  return response.data;
}
