import { useCallback } from "react";
import { useSublayDispatch } from "../../store/hooks";
import {
  setEntityListLoading,
  setEntityListEntities,
  setEntityListHasMore,
  setEntityListError,
  addEntity,
  removeEntity,
} from "../../store/slices/entityListsSlice";
import {
  useLazyFetchEntitiesQuery,
  useCreateEntityMutation,
  useDeleteEntityMutation,
} from "../../store/api/entityListsApi";
import { handleError as handleErrorUtil } from "../../utils/handleError";
import useProject from "../projects/useProject";
import type { Entity, EntityIncludeParam } from "../../interfaces/models/Entity";
import type { EntityListSortByOptions, SortByReaction, SortDirection, SortType } from "../../interfaces/EntityListSortByOptions";
import type { TimeFrame } from "../../interfaces/TimeFrame";
import type { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import type { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import type { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import type { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import type { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import type { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";
import type { NsfwFilter } from "../../interfaces/NsfwFilter";
import type { SpaceReputationContextObject } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

interface FetchEntitiesOptions {
  page: number;

  // Sort properties
  sortBy: EntityListSortByOptions;
  sortByReaction?: SortByReaction;
  sortDir?: SortDirection | null;
  sortType?: SortType;

  // Filter properties
  timeFrame?: TimeFrame | null;
  userId?: string | null;
  followedOnly?: boolean;
  locationFilters?: LocationFilters | null;
  keywordsFilters?: KeywordsFilters | null;
  metadataFilters?: MetadataFilters | null;
  titleFilters?: TitleFilters | null;
  contentFilters?: ContentFilters | null;
  attachmentsFilters?: AttachmentsFilters | null;
  nsfwFilter?: NsfwFilter | null;

  // Configuration
  sourceId?: string | null;
  spaceId?: string | null;
  limit: number;
  include?: EntityIncludeParam | null;
  /**
   * Primary form. Flattened to `spaceReputationId`/`spaceReputationDescendants`
   * before it reaches the serializer.
   */
  spaceReputation?: SpaceReputationContextObject;
  /** @deprecated Use `spaceReputation` instead. */
  spaceReputationId?: string | null;
  /** @deprecated Use `spaceReputation.includeDescendants` instead. */
  spaceReputationDescendants?: boolean | null;
}

interface CreateEntityOptions {
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
  insertPosition?: "first" | "last";
}

interface DeleteEntityOptions {
  entityId: string;
}

export interface UseEntityListActionsValues {
  fetchEntities: (listId: string, options: FetchEntitiesOptions) => Promise<Entity[] | null>;
  createEntity: (listId: string, options: CreateEntityOptions) => Promise<Entity | undefined>;
  deleteEntity: (listId: string, options: DeleteEntityOptions) => Promise<void>;
}

/**
 * Redux-powered hook that provides all entity list actions
 * Uses RTK Query for stable function references and proper caching
 */
export function useEntityListActions(): UseEntityListActionsValues {
  const dispatch = useSublayDispatch();

  // Get project and user context
  const { projectId } = useProject();

  // RTK Query hooks
  const [triggerFetchEntities] = useLazyFetchEntitiesQuery();
  const [createEntityMutation] = useCreateEntityMutation();
  const [deleteEntityMutation] = useDeleteEntityMutation();

  // Fetch entities action
  const fetchEntities = useCallback(
    async (
      listId: string,
      options: FetchEntitiesOptions
    ): Promise<Entity[] | null> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      if (!options.sortBy) {
        console.warn("sortBy is required for fetching entities");
        return null;
      }

      dispatch(setEntityListLoading({ listId, loading: true }));

      // Normalize the reputation params at this input boundary so the
      // `spaceReputation` object never reaches RTK Query's serializer.
      const reputationParams = buildSpaceReputationParams({
        spaceReputation: options.spaceReputation,
        spaceReputationId: options.spaceReputationId,
        spaceReputationDescendants: options.spaceReputationDescendants,
      });

      try {
        const result = await triggerFetchEntities({
          projectId,
          page: options.page,
          sortBy: options.sortBy,
          sortByReaction: options.sortByReaction,
          sortDir: options.sortDir,
          sortType: options.sortType,
          timeFrame: options.timeFrame,
          userId: options.userId,
          sourceId: options.sourceId,
          spaceId: options.spaceId,
          followedOnly: options.followedOnly ?? false,
          limit: options.limit,
          locationFilters: options.locationFilters,
          keywordsFilters: options.keywordsFilters,
          metadataFilters: options.metadataFilters,
          titleFilters: options.titleFilters,
          contentFilters: options.contentFilters,
          attachmentsFilters: options.attachmentsFilters,
          nsfwFilter: options.nsfwFilter,
          include: options.include,
          spaceReputationId: reputationParams.spaceReputationId,
          spaceReputationDescendants: reputationParams.spaceReputationDescendants,
        }).unwrap();

        if (result) {
          const append = options.page > 1;
          dispatch(setEntityListEntities({ listId, entities: result.data, append }));
          dispatch(
            setEntityListHasMore({
              listId,
              hasMore: result.pagination.hasMore,
            })
          );
          return result.data;
        }

        return null;
      } catch (err) {
        console.error(
          `[EntityListActionsRedux] Failed to fetch entities for listId: ${listId}`,
          err
        );
        handleErrorUtil(err, "Failed to fetch entities:");
        dispatch(
          setEntityListError({ listId, error: "Failed to fetch entities" })
        );
        throw err;
      } finally {
        dispatch(setEntityListLoading({ listId, loading: false }));
      }
    },
    [dispatch, projectId, triggerFetchEntities]
  );

  // Create entity action
  const createEntity = useCallback(
    async (
      listId: string,
      options: CreateEntityOptions
    ): Promise<Entity | undefined> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      try {
        const newEntity = await createEntityMutation({
          projectId,
          foreignId: options.foreignId,
          title: options.title,
          content: options.content,
          attachments: options.attachments,
          keywords: options.keywords,
          location: options.location,
          metadata: options.metadata,
          sourceId: options.sourceId,
          spaceId: options.spaceId,
        }).unwrap();

        // Add to the list
        dispatch(
          addEntity({
            listId,
            entity: newEntity,
            insertPosition: options.insertPosition,
          })
        );

        return newEntity;
      } catch (err) {
        handleErrorUtil(err, "Failed to create entity");
        throw err;
      }
    },
    [dispatch, projectId, createEntityMutation]
  );

  // Delete entity action
  const deleteEntity = useCallback(
    async (listId: string, options: DeleteEntityOptions): Promise<void> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      try {
        await deleteEntityMutation({
          projectId,
          entityId: options.entityId,
        }).unwrap();

        // Remove from the list
        dispatch(removeEntity({ listId, entityId: options.entityId }));
      } catch (err) {
        handleErrorUtil(err, "Failed to delete entity");
        throw err;
      }
    },
    [dispatch, projectId, deleteEntityMutation]
  );

  return {
    fetchEntities,
    createEntity,
    deleteEntity,
  };
}

export default useEntityListActions;
