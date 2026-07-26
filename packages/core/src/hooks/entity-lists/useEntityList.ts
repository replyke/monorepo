import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";

import {
  initializeList,
  updateFiltersAndSortConfig,
  setEntityListLoading,
  setEntityListEntities,
  incrementPage,
  selectEntityList,
  selectEntityListEntities,
  selectEntityListLoading,
  selectEntityListHasMore,
  selectEntityListFilters,
  selectEntityListSort,
  selectEntityListConfig,
  type EntityListFilters,
  type EntityListSort,
  type EntityListConfig,
  type EntityListFetchOptions,
} from "../../store/slices/entityListsSlice";

import useInfusedData from "./useInfusedData";
import useEntityListActions from "./useEntityListActions";

import { Entity } from "../../interfaces/models/Entity";
import { EntityListSortByOptions, SortByReaction, SortDirection, SortType } from "../../interfaces/EntityListSortByOptions";
import { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import { TimeFrame } from "../../interfaces/TimeFrame";
import { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";

import { handleError } from "../../utils/handleError";

export interface UseEntityListProps {
  listId: string;
  infuseData?: (foreignId: string) => Promise<Record<string, any> | null>;
}

export interface EntityListCreateEntityProps {
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
  insertPosition?: "first" | "last";
}

export interface EntityListDeleteEntityProps {
  entityId: string;
}

export interface UseEntityListValues {
  entities: Entity[];
  // setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  infusedEntities: (Entity & Record<string, any>)[];

  loading: boolean;
  hasMore: boolean;

  // Individual sort properties (flat access for convenience)
  sortBy: EntityListSortByOptions | null;
  sortByReaction: SortByReaction | null;
  sortDir: SortDirection | null;
  sortType: SortType | null;

  // Filter properties
  timeFrame: TimeFrame | null;
  sourceId: string | null;
  userId: string | null;
  followedOnly: boolean;
  keywordsFilters: KeywordsFilters | null;
  titleFilters: TitleFilters | null;
  contentFilters: ContentFilters | null;
  attachmentsFilters: AttachmentsFilters | null;
  locationFilters: LocationFilters | null;
  metadataFilters: MetadataFilters | null;

  fetchEntities: (
    filters: Partial<EntityListFilters>,
    sort?: Partial<EntityListSort>,
    config?: EntityListConfig,
    options?: EntityListFetchOptions
  ) => void;

  loadMore: () => void;
  createEntity: (props: EntityListCreateEntityProps) => Promise<Entity | undefined>;
  deleteEntity: (props: EntityListDeleteEntityProps) => Promise<void>;
}

function useEntityList({
  listId,
  infuseData,
}: UseEntityListProps): UseEntityListValues {
  const dispatch = useSublayDispatch();

  // Get state from Redux (parameterized selectors)
  const entityList = useSublaySelector((state) =>
    selectEntityList(state, listId)
  );
  const entities = useSublaySelector((state) =>
    selectEntityListEntities(state, listId)
  );
  const loading = useSublaySelector((state) =>
    selectEntityListLoading(state, listId)
  );
  const hasMore = useSublaySelector((state) =>
    selectEntityListHasMore(state, listId)
  );
  const filters = useSublaySelector((state) =>
    selectEntityListFilters(state, listId)
  );
  const sort = useSublaySelector((state) =>
    selectEntityListSort(state, listId)
  );
  const config = useSublaySelector((state) =>
    selectEntityListConfig(state, listId)
  );

  // Get entity actions hook
  const entityActions = useEntityListActions();

  // Infused data
  const infusedEntities = useInfusedData({ entities, infuseData });

  // Debounce timer for filter changes
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch entities function (always triggers a fetch)
  const handleFetchEntities = useCallback(
    (
      newFilters: Partial<EntityListFilters>,
      newSort?: Partial<EntityListSort>,
      newConfig?: EntityListConfig,
      options?: EntityListFetchOptions
    ) => {
      // Apply config defaults if not provided
      const configWithDefaults = {
        sourceId: null,
        limit: 10,
        include: null,
        ...newConfig,
      };

      // Ensure Redux state is initialized and update filters/sort/config
      dispatch(initializeList({ listId }));
      dispatch(updateFiltersAndSortConfig({
        listId,
        filters: newFilters,
        sort: newSort,
        config: configWithDefaults,
        options
      }));

      // Clear entities immediately if requested
      if (options?.clearImmediately) {
        dispatch(
          setEntityListEntities({ listId, entities: [], append: false })
        );
      }

      // Define the fetch logic
      const performFetch = async () => {
        // Use the applied config (configWithDefaults is the source of truth for this fetch)
        const currentConfig = {
          sourceId: configWithDefaults.sourceId,
          spaceId: configWithDefaults.spaceId,
          limit: configWithDefaults.limit,
          include: configWithDefaults.include,
          // Object form (primary) + deprecated flat props; flattened downstream
          // by useEntityListActions before reaching the serializer.
          spaceReputation: configWithDefaults.spaceReputation,
          spaceReputationId: configWithDefaults.spaceReputationId,
          spaceReputationDescendants: configWithDefaults.spaceReputationDescendants,
        };

        // Build final filters by taking current state and applying new filters
        // Use entityList if available, otherwise get current state from Redux after our updates
        const currentState = entityList || {
          sortBy: "hot",
          sortByReaction: "upvote",
          sortDir: null,
          sortType: "auto",
          timeFrame: null,
          userId: null,
          followedOnly: false,
          keywordsFilters: null,
          titleFilters: null,
          contentFilters: null,
          attachmentsFilters: null,
          locationFilters: null,
          metadataFilters: null,
          nsfwFilter: null,
        };
        const finalFilters = { ...currentState };

        // Apply resetFilters flag - reset only filter properties
        if (options?.resetFilters) {
          finalFilters.timeFrame = null;
          finalFilters.userId = null;
          finalFilters.followedOnly = false;
          finalFilters.keywordsFilters = null;
          finalFilters.titleFilters = null;
          finalFilters.contentFilters = null;
          finalFilters.attachmentsFilters = null;
          finalFilters.locationFilters = null;
          finalFilters.metadataFilters = null;
          finalFilters.nsfwFilter = null;
        }

        // Apply resetSort flag - reset only sort properties
        if (options?.resetSort) {
          finalFilters.sortBy = "hot";
          finalFilters.sortByReaction = "upvote";
          finalFilters.sortDir = null;
          finalFilters.sortType = "auto";
        }

        // Apply new filters
        Object.keys(newFilters).forEach((key) => {
          if (newFilters[key as keyof typeof newFilters] !== undefined) {
            (finalFilters as any)[key] =
              newFilters[key as keyof typeof newFilters];
          }
        });

        // Apply new sort
        if (newSort) {
          if (newSort.sortBy !== undefined) finalFilters.sortBy = newSort.sortBy;
          if (newSort.sortByReaction !== undefined) finalFilters.sortByReaction = newSort.sortByReaction;
          if (newSort.sortDir !== undefined) finalFilters.sortDir = newSort.sortDir;
          if (newSort.sortType !== undefined) finalFilters.sortType = newSort.sortType;
        }

        if (!finalFilters.sortBy) return; // sortBy is required

        dispatch(setEntityListLoading({ listId, loading: true }));

        try {
          await entityActions.fetchEntities(listId, {
            page: 1,
            // User-controlled filters from Redux state + new filters
            sortBy: finalFilters.sortBy,
            sortByReaction: finalFilters.sortByReaction,
            sortDir: finalFilters.sortDir,
            sortType: finalFilters.sortType,
            timeFrame: finalFilters.timeFrame,
            userId: finalFilters.userId,
            followedOnly: finalFilters.followedOnly,
            locationFilters: finalFilters.locationFilters,
            keywordsFilters: finalFilters.keywordsFilters,
            metadataFilters: finalFilters.metadataFilters,
            titleFilters: finalFilters.titleFilters,
            contentFilters: finalFilters.contentFilters,
            attachmentsFilters: finalFilters.attachmentsFilters,
            nsfwFilter: finalFilters.nsfwFilter,
            // Configuration parameters from current config
            limit: currentConfig.limit,
            sourceId: currentConfig.sourceId,
            spaceId: currentConfig.spaceId,
            include: currentConfig.include,
            spaceReputation: currentConfig.spaceReputation,
            spaceReputationId: currentConfig.spaceReputationId,
            spaceReputationDescendants: currentConfig.spaceReputationDescendants,
          });
        } catch (err) {
          console.error(
            `[EntityListRedux] Failed to fetch entities for listId: ${listId}`,
            err
          );
        }
      };

      // Execute immediately if requested, otherwise debounce
      // For initial loads (empty filters and no sort), make it immediate by default
      const shouldBeImmediate =
        options?.fetchImmediately ||
        (Object.keys(newFilters).length === 0 && !newSort);

      if (shouldBeImmediate) {
        performFetch();
      } else {
        // Clear existing debounce timer
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        // Debounce the actual fetch
        debounceTimer.current = setTimeout(() => {
          performFetch();
        }, 800); // 800ms debounce delay
      }
    },
    [dispatch, listId, entityList, config, entityActions.fetchEntities]
  );

  // Load more function
  const loadMore = useCallback(async () => {
    if (!entityList || loading || !hasMore) return;

    // Check if fetchEntities has been called before (safeguard)
    if (!config) {
      console.error(
        `[EntityListRedux] loadMore called before fetchEntities for listId: ${listId}. ` +
        `fetchEntities must be called first to initialize configuration.`
      );
      return;
    }

    const nextPage = entityList.page + 1;
    dispatch(incrementPage(listId));

    // Directly fetch the next page
    try {
      await entityActions.fetchEntities(listId, {
        page: nextPage,
        // User-controlled filters from Redux state
        userId: entityList.userId,
        followedOnly: entityList.followedOnly,
        sortBy: entityList.sortBy,
        sortByReaction: entityList.sortByReaction,
        sortDir: entityList.sortDir,
        sortType: entityList.sortType,
        timeFrame: entityList.timeFrame,
        locationFilters: entityList.locationFilters,
        keywordsFilters: entityList.keywordsFilters,
        metadataFilters: entityList.metadataFilters,
        titleFilters: entityList.titleFilters,
        contentFilters: entityList.contentFilters,
        attachmentsFilters: entityList.attachmentsFilters,
        nsfwFilter: entityList.nsfwFilter,
        // Configuration parameters from state (single source of truth)
        limit: config.limit,
        sourceId: config.sourceId,
        spaceId: config.spaceId,
        include: config.include,
        spaceReputationId: config.spaceReputationId,
        spaceReputationDescendants: config.spaceReputationDescendants,
      });
    } catch (err) {
      console.error(
        `[EntityListRedux] Failed to load more entities for listId: ${listId}`,
        err
      );
    }
  }, [
    dispatch,
    listId,
    config,
    entityList,
    loading,
    hasMore,
    entityActions.fetchEntities,
  ]);

  // Create entity function
  const createEntity = useCallback(
    async ({
      insertPosition,
      ...restOfProps
    }: EntityListCreateEntityProps) => {
      try {
        const newEntity = await entityActions.createEntity(listId, {
          ...restOfProps,
          sourceId: config?.sourceId || undefined,
          spaceId: config?.spaceId || undefined,
          insertPosition,
        });

        return newEntity;
      } catch (err) {
        // Error handling is now done in entityActions.createEntity
        handleError(err, "Failed to create entity");
      }
    },
    [entityActions.createEntity, dispatch, listId, config]
  );

  // Delete entity function
  const deleteEntity = useCallback(
    async ({ entityId }: EntityListDeleteEntityProps) => {
      try {
        await entityActions.deleteEntity(listId, { entityId });
      } catch (err) {
        // Error handling is now done in entityActions.deleteEntity
        handleError(err, "Failed to delete entity");
      }
    },
    [entityActions.deleteEntity, dispatch, listId]
  );

  // Load more entities when page changes - REMOVED
  // This useEffect was causing duplicate API calls and race conditions
  // Load more is now handled directly in the loadMore function

  // fetchEntities now handles fetching directly when called
  // No automatic filter change detection needed

  // Legacy setEntities function for compatibility
  // const handleSetEntities = useCallback(
  //   (updater: React.SetStateAction<Entity[]>) => {
  //     if (typeof updater === "function") {
  //       const newEntities = updater(entities);
  //       dispatch(
  //         setEntityListEntities({
  //           listId,
  //           entities: newEntities,
  //           append: false,
  //         })
  //       );
  //     } else {
  //       dispatch(
  //         setEntityListEntities({ listId, entities: updater, append: false })
  //       );
  //     }
  //   },
  //   [dispatch, listId, entities]
  // );

  // No automatic initialization - state is only created when fetchEntities is called

  return useMemo(
    () => ({
      entities,
      // setEntities: handleSetEntities,
      infusedEntities,

      loading,
      hasMore,

      // Individual sort properties (flat access for convenience)
      sortBy: sort?.sortBy || null,
      sortByReaction: sort?.sortByReaction || null,
      sortDir: sort?.sortDir || null,
      sortType: sort?.sortType || null,

      // Filter properties
      timeFrame: filters?.timeFrame || null,
      sourceId: config?.sourceId || null,
      userId: filters?.userId || null,
      followedOnly: filters?.followedOnly || false,

      keywordsFilters: filters?.keywordsFilters || null,
      titleFilters: filters?.titleFilters || null,
      contentFilters: filters?.contentFilters || null,
      attachmentsFilters: filters?.attachmentsFilters || null,
      locationFilters: filters?.locationFilters || null,
      metadataFilters: filters?.metadataFilters || null,

      fetchEntities: handleFetchEntities,

      loadMore,
      createEntity,
      deleteEntity,
    }),
    [
      entities,
      infusedEntities,
      loading,
      hasMore,
      sort,
      filters,
      config,
      handleFetchEntities,
      loadMore,
      createEntity,
      deleteEntity,
    ]
  );
}

export default useEntityList;
