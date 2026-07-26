import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Entity, EntityIncludeParam } from "../../interfaces/models/Entity";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import { EntityListSortByOptions, SortByReaction, SortDirection, SortType } from "../../interfaces/EntityListSortByOptions";
import { TimeFrame } from "../../interfaces/TimeFrame";
import { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";
import { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import { NsfwFilter } from "../../interfaces/NsfwFilter";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

// Helper to serialize objects into bracket notation for query params
const serializeObject = (obj: any, prefix: string): Record<string, any> => {
  const params: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const paramKey = prefix ? `${prefix}[${key}]` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item !== null && item !== undefined) {
            if (typeof item === 'object') {
              Object.assign(params, serializeObject(item, `${paramKey}[${index}]`));
            } else {
              params[`${paramKey}[${index}]`] = item;
            }
          }
        });
      } else if (typeof value === 'object') {
        Object.assign(params, serializeObject(value, paramKey));
      } else {
        params[paramKey] = value;
      }
    }
  }

  return params;
};

interface FetchManyEntitiesParams extends SpaceReputationContextParams {
  page?: number;
  limit?: number;
  sortBy?: EntityListSortByOptions;
  sortByReaction?: SortByReaction;
  sortDir?: SortDirection | null;
  sortType?: SortType;
  timeFrame?: TimeFrame | null;
  sourceId?: string | null;
  spaceId?: string | null;
  userId?: string | null;
  followedOnly?: boolean;
  keywordsFilters?: KeywordsFilters | null;
  titleFilters?: TitleFilters | null;
  contentFilters?: ContentFilters | null;
  attachmentsFilters?: AttachmentsFilters | null;
  locationFilters?: LocationFilters | null;
  metadataFilters?: MetadataFilters | null;
  nsfwFilter?: NsfwFilter | null;
  include?: EntityIncludeParam;
}

function useFetchManyEntities(): (params?: FetchManyEntitiesParams) => Promise<PaginatedResponse<Entity>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchManyEntities = useCallback(
    async (params?: FetchManyEntitiesParams) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const queryParams: Record<string, any> = {};

      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortByReaction) queryParams.sortByReaction = params.sortByReaction;
      if (params?.sortDir) queryParams.sortDir = params.sortDir;
      if (params?.sortType) queryParams.sortType = params.sortType;
      if (params?.timeFrame) queryParams.timeFrame = params.timeFrame;
      if (params?.sourceId) queryParams.sourceId = params.sourceId;
      if (params?.spaceId) queryParams.spaceId = params.spaceId;
      if (params?.userId) queryParams.userId = params.userId;
      if (params?.followedOnly !== undefined) queryParams.followedOnly = params.followedOnly;
      if (params?.nsfwFilter) queryParams.nsfwFilter = params.nsfwFilter;
      Object.assign(
        queryParams,
        buildSpaceReputationParams({
          spaceReputation: params?.spaceReputation,
          spaceReputationId: params?.spaceReputationId,
          spaceReputationDescendants: params?.spaceReputationDescendants,
        })
      );

      if (params?.include) {
        queryParams.include = Array.isArray(params.include)
          ? params.include.join(',')
          : params.include;
      }

      // Serialize complex filter objects into bracket notation
      if (params?.keywordsFilters) {
        Object.assign(queryParams, serializeObject(params.keywordsFilters, 'keywordsFilters'));
      }
      if (params?.titleFilters) {
        Object.assign(queryParams, serializeObject(params.titleFilters, 'titleFilters'));
      }
      if (params?.contentFilters) {
        Object.assign(queryParams, serializeObject(params.contentFilters, 'contentFilters'));
      }
      if (params?.attachmentsFilters) {
        Object.assign(queryParams, serializeObject(params.attachmentsFilters, 'attachmentsFilters'));
      }
      if (params?.locationFilters) {
        Object.assign(queryParams, serializeObject(params.locationFilters, 'locationFilters'));
      }
      if (params?.metadataFilters) {
        Object.assign(queryParams, serializeObject(params.metadataFilters, 'metadataFilters'));
      }

      const response = await axios.get<PaginatedResponse<Entity>>(
        `/${projectId}/entities`,
        {
          params: queryParams,
        }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchManyEntities;
}

export default useFetchManyEntities;
