import { baseApi } from "./baseApi";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import type { Entity, EntityIncludeParam } from "../../interfaces/models/Entity";
import type { EntityListSortByOptions, SortByReaction, SortDirection, SortType } from "../../interfaces/EntityListSortByOptions";
import { validateSortBy } from "../../interfaces/EntityListSortByOptions";
import type { TimeFrame } from "../../interfaces/TimeFrame";
import type { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import type { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import type { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import type { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import type { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import type { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";
import type { NsfwFilter } from "../../interfaces/NsfwFilter";

// Helper function to serialize objects using bracket notation (like Axios does)
const serializeObject = (obj: any, prefix = ''): Record<string, any> => {
  const params: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const paramKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) {
        continue;
      } else if (Array.isArray(value)) {
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

// Helper function to build clean query parameters
const buildQueryParams = (params: Record<string, any>): Record<string, any> => {
  const cleanParams: Record<string, any> = {};

  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined values, but allow null for sourceId and spaceId
    if (value === undefined || (value === null && !['sourceId', 'spaceId'].includes(key))) {
      return;
    }

    // Skip default values that don't need to be sent
    if (key === 'followedOnly' && value === false) {
      return;
    }

    // Serialize filter objects using bracket notation (like Axios)
    if (key.endsWith('Filters') && typeof value === 'object' && value !== null) {
      Object.assign(cleanParams, serializeObject(value, key));
    } else {
      // Include all other meaningful values as-is
      cleanParams[key] = value;
    }
  });

  return cleanParams;
};

// API parameters types
interface FetchEntitiesParams {
  projectId: string;
  page: number;
  limit: number;

  // Sort parameters
  sortBy: EntityListSortByOptions | null;
  sortByReaction?: SortByReaction;
  sortDir?: SortDirection | null;
  sortType?: SortType | null;

  // Filter parameters
  timeFrame?: TimeFrame | null;
  userId?: string | null;
  followedOnly?: boolean;
  keywordsFilters?: KeywordsFilters | null;
  locationFilters?: LocationFilters | null;
  metadataFilters?: MetadataFilters | null;
  titleFilters?: TitleFilters | null;
  contentFilters?: ContentFilters | null;
  attachmentsFilters?: AttachmentsFilters | null;
  nsfwFilter?: NsfwFilter | null;

  // Configuration parameters
  sourceId?: string | null;
  spaceId?: string | null;
  include?: EntityIncludeParam | null;
  spaceReputationId?: string | null;
  spaceReputationDescendants?: boolean | null;
}

interface CreateEntityParams {
  projectId: string;
  foreignId?: string;
  title?: string;
  content?: string;
  attachments?: Record<string, any>[];
  keywords?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
  sourceId?: string | null;
  spaceId?: string | null;
}

interface UpdateEntityParams {
  projectId: string;
  entityId: string;
  update: {
    title?: string;
    content?: string;
    attachments?: Record<string, any>[];
    keywords?: string[];
    location?: {
      latitude: number;
      longitude: number;
    };
    metadata?: Record<string, any>;
  };
}

interface DeleteEntityParams {
  projectId: string;
  entityId: string;
}

// Extended API with entity lists endpoints
export const entityListsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch paginated entities with filters
    fetchEntities: builder.query<PaginatedResponse<Entity>, FetchEntitiesParams>({
      query: ({
        projectId,
        page,
        limit,
        sortBy,
        sortByReaction,
        sortDir,
        sortType,
        timeFrame,
        sourceId,
        spaceId,
        userId,
        followedOnly,
        keywordsFilters,
        locationFilters,
        metadataFilters,
        titleFilters,
        contentFilters,
        attachmentsFilters,
        nsfwFilter,
        include,
        spaceReputationId,
        spaceReputationDescendants
      }) => {
        if (!sortBy) {
          throw new Error("sortBy is required for fetching entities");
        }

        // Validate sortBy (especially for metadata.* patterns)
        validateSortBy(sortBy);

        return {
          url: `/${projectId}/entities`,
          method: "GET",
          params: buildQueryParams({
            page,
            limit,
            followedOnly,
            userId,
            sourceId,
            spaceId,
            spaceReputationId,
            spaceReputationDescendants:
              spaceReputationDescendants === null ? undefined : spaceReputationDescendants,
            sortBy,
            sortByReaction,
            sortDir,
            sortType,
            timeFrame,
            keywordsFilters,
            metadataFilters,
            titleFilters,
            contentFilters,
            attachmentsFilters,
            locationFilters,
            nsfwFilter,
            include: include
              ? Array.isArray(include) ? include.join(',') : include
              : undefined,
          }),
        };
      },
      providesTags: (result, error, { projectId, sourceId, spaceId }) => [
        { type: "Entity" as const, id: `${projectId}-${sourceId || 'all'}-${spaceId || 'no-space'}-LIST` },
        ...(result?.data?.map(({ id }) => ({
          type: "Entity" as const,
          id,
        })) ?? []),
      ],
    }),

    // Create entity
    createEntity: builder.mutation<Entity, CreateEntityParams>({
      query: ({ projectId, ...body }) => ({
        url: `/${projectId}/entities`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { projectId, sourceId, spaceId }) => [
        { type: "Entity", id: `${projectId}-${sourceId || 'all'}-${spaceId || 'no-space'}-LIST` },
        // Also invalidate the 'all' list if we're creating in a specific source
        ...(sourceId ? [{ type: "Entity" as const, id: `${projectId}-all-no-space-LIST` }] : []),
      ],
    }),

    // Update entity
    updateEntity: builder.mutation<Entity, UpdateEntityParams>({
      query: ({ projectId, entityId, update }) => ({
        url: `/${projectId}/entities/${entityId}`,
        method: "PATCH",
        body: update,
      }),
      invalidatesTags: (result, error, { projectId, entityId }) => [
        { type: "Entity", id: entityId },
        // Invalidate all lists that might contain this entity
        { type: "Entity", id: `${projectId}-all-LIST` },
      ],
    }),

    // Delete entity
    deleteEntity: builder.mutation<void, DeleteEntityParams>({
      query: ({ projectId, entityId }) => ({
        url: `/${projectId}/entities/${entityId}`,
        method: "DELETE",
        responseHandler: async (response) => {
          // Handle text responses (like "OK" from res.sendStatus(200))
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return response.json();
          }
          // For text responses, just return void since we don't need the content
          return response.text().then(() => undefined);
        },
      }),
      invalidatesTags: (result, error, { projectId, entityId }) => [
        { type: "Entity", id: entityId },
        // Invalidate all lists that might have contained this entity
        { type: "Entity", id: `${projectId}-all-LIST` },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useFetchEntitiesQuery,
  useLazyFetchEntitiesQuery,
  useCreateEntityMutation,
  useUpdateEntityMutation,
  useDeleteEntityMutation,
} = entityListsApi;

// Export for manual cache management
export const {
  fetchEntities,
  createEntity,
  updateEntity,
  deleteEntity,
} = entityListsApi.endpoints;