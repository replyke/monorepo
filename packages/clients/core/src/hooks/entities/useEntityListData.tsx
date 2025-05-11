import { useCallback, useEffect, useRef, useState } from "react";
import { Entity } from "../../interfaces/models/Entity";
import { EntityListSortByOptions } from "../../interfaces/EntityListSortByOptions";
import useCreateEntity from "./useCreateEntity";
import useFetchManyEntities from "./useFetchManyEntities";
import useDeleteEntity from "./useDeleteEntity";

import { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import useInfusedData from "./useInfusedData";
import { TimeFrame } from "../../interfaces/TimeFrame";
import { handleError } from "../../utils/handleError";
import { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";

export interface UseEntityListDataProps {
  limit?: number;
  sortBy?: EntityListSortByOptions;
  timeFrame?: TimeFrame | null;

  sourceId?: string | null;
  userId?: string | null;
  followedOnly?: boolean;

  keywordsFilters?: KeywordsFilters | null;
  titleFilters?: TitleFilters | null;
  contentFilters?: ContentFilters | null;
  attachmentsFilters?: AttachmentsFilters | null;
  locationFilters?: LocationFilters | null;
  metadataFilters?: MetadataFilters | null;

  idle?: boolean;
  onReset?: () => void;
  infuseData?: (foreignId: string) => Promise<Record<string, any> | null>;
}

export interface UseEntityListDataValues {
  entities: Entity[];
  infusedEntities: (Entity & Record<string, any>)[];

  loading: boolean;
  hasMore: boolean;
  resetting: boolean;

  sortBy: EntityListSortByOptions | null;
  setSortBy: (sortBy: EntityListSortByOptions) => void;
  timeFrame: TimeFrame | null;
  setTimeFrame: (timeFrame: TimeFrame | null) => void;
  sourceId: string | null;
  setSourceId: (sourceId: string | null) => void;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  followedOnly: boolean;
  setFollowedOnly: (state: boolean) => void;

  keywordsFilters: KeywordsFilters | null;
  updateKeywordsFilters: (
    type: "add" | "remove" | "reset" | "replace",
    key: "includes" | "doesNotInclude" | "both",
    value?: string | string[]
  ) => void;
  titleFilters: TitleFilters | null;
  setTitleFilters: (metadata: TitleFilters | null) => void;
  contentFilters: ContentFilters | null;
  setContentFilters: (metadata: ContentFilters | null) => void;
  attachmentsFilters: AttachmentsFilters | null;
  setAttachmentsFilters: (metadata: AttachmentsFilters | null) => void;
  locationFilters: LocationFilters | null;
  setLocationFilters: (location: LocationFilters | null) => void;
  metadataFilters: MetadataFilters | null;
  setMetadataFilters: (metadata: MetadataFilters | null) => void;

  kickstart: () => void;
  loadMore: () => void;
  resetEntities: () => Promise<void>;
  createEntity: (props: {
    foreignId?: string;
    sourceId?: string;
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
  }) => Promise<Entity | undefined>;
  deleteEntity: (props: { entityId: string }) => Promise<void>;
}

function useEntityListData({
  limit = 10,

  sortBy: sortByProp = "hot",
  timeFrame: timeFrameProp = null,
  sourceId: sourceIdProp = null,
  userId: userIdProp = null,
  followedOnly: followedOnlyProp,
  keywordsFilters: keywordsFiltersProp = null,
  locationFilters: locationFiltersProp = null,
  metadataFilters: metadataFiltersProp = null,
  titleFilters: titleFiltersProp = null,
  contentFilters: contentFiltersProp = null,
  attachmentsFilters: attachmentsFiltersProp = null,

  idle = false,
  onReset,
  infuseData,
}: UseEntityListDataProps): UseEntityListDataValues {
  const [entities, setEntities] = useState<Entity[]>([]);

  const [page, setPage] = useState(1);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [idling, setIdling] = useState(idle);

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true); // required to trigger rerenders

  const [resetting, setResetting] = useState(true); // Specifically to indicate when we're loading new entities due to a reset

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true); // required to trigger rerenders

  const [followedOnly, setFollowedOnly] = useState<boolean>(!!followedOnlyProp);
  const [sortBy, setSortBy] = useState<EntityListSortByOptions>(sortByProp);

  const [sourceId, setSourceId] = useState<string | null>(sourceIdProp);
  const [userId, setUserId] = useState<string | null>(userIdProp);
  const [timeFrame, setTimeFrame] = useState<TimeFrame | null>(timeFrameProp);
  const [keywordsFilters, setKeywordsFilters] =
    useState<KeywordsFilters | null>(keywordsFiltersProp);
  const [metadataFilters, setMetadataFilters] =
    useState<MetadataFilters | null>(metadataFiltersProp);
  const [titleFilters, setTitleFilters] = useState<TitleFilters | null>(
    titleFiltersProp
  );
  const [contentFilters, setContentFilters] = useState<ContentFilters | null>(
    contentFiltersProp
  );
  const [attachmentsFilters, setAttachmentsFilters] =
    useState<AttachmentsFilters | null>(attachmentsFiltersProp);
  const [locationFilters, setLocationFilters] =
    useState<LocationFilters | null>(locationFiltersProp);

  const infusedEntities = useInfusedData({ entities, infuseData });

  const fetchManyEntities = useFetchManyEntities();
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();

  const kickstart = () => setIdling(false);

  /**
   * Updates the keywords state based on the action provided.
   *
   * @param type - The action type ('add', 'remove', 'reset').
   * @param key - The keyword list to modify ('included', 'excluded').
   * @param value - The value(s) to add or remove (optional).
   */
  const updateKeywordsFilters = (
    type: "add" | "remove" | "reset" | "replace",
    key: "includes" | "doesNotInclude" | "both",
    value?: string | string[]
  ) => {
    const items = Array.isArray(value) ? value : value ? [value] : [];

    setKeywordsFilters((prev) => {
      if (!prev) prev = {};

      switch (type) {
        case "add": {
          if (key === "both") return prev; // Invalid to add to both

          return {
            ...prev,
            [key]: Array.from(new Set([...(prev[key] || []), ...items])),
          };
        }

        case "remove": {
          if (key === "both") {
            return {
              includes: (prev.includes || []).filter(
                (item) => !items.includes(item)
              ),
              doesNotInclude: (prev.doesNotInclude || []).filter(
                (item) => !items.includes(item)
              ),
            };
          }

          return {
            ...prev,
            [key]: (prev[key] || []).filter((item) => !items.includes(item)),
          };
        }

        case "reset": {
          if (key === "both") return null; // Resets everything
          return {
            ...prev,
            [key]: undefined,
          };
        }

        case "replace": {
          if (key === "both") return prev; // Replace does not apply to both
          return {
            ...prev,
            [key]: items,
          };
        }

        default:
          return prev;
      }
    });
  };

  const handleCreateEntity = useCallback(
    async ({
      insertPosition,
      ...restOfProps
    }: {
      foreignId?: string;
      sourceId?: string;
      title?: string;
      content?: string;
      media?: any[];
      keywords?: string[];
      location?: {
        latitude: number;
        longitude: number;
      };
      metadata?: Record<string, any>;
      insertPosition?: "first" | "last";
    }) => {
      try {
        const newEntity = await createEntity(restOfProps);

        if (insertPosition === "last") {
          setEntities?.((prevEntities) => [...prevEntities, newEntity]);
        } else {
          setEntities?.((prevEntities) => [newEntity, ...prevEntities]);
        }

        return newEntity;
      } catch (err) {
        handleError(err, "Failed to create entity");
      }
    },
    [createEntity]
  );

  const handleDeleteEntity = useCallback(
    async ({ entityId }: { entityId: string }) => {
      try {
        await deleteEntity({ entityId });
        setEntities((prev) => prev.filter((e) => e.id !== entityId));
      } catch (err) {
        handleError(err, "Failed to delete entity");
      }
    },
    [deleteEntity]
  );

  const resetEntities = useCallback(async () => {
    if (idling) return;
    loading.current = true;
    setLoadingState(true);
    setResetting(true);

    hasMore.current = true;
    setHasMoreState(true);
    setPage(1);
    try {
      const newEntities = await fetchManyEntities({
        page: 1,
        sortBy,
        timeFrame,
        userId,
        sourceId,
        followedOnly,
        limit,
        locationFilters,
        keywordsFilters,
        metadataFilters,
        titleFilters,
        contentFilters,
        attachmentsFilters,
      });

      if (newEntities) {
        setEntities(newEntities);

        if (newEntities.length < limit) {
          hasMore.current = false;
          setHasMoreState(false);
        }
      }
    } catch (err) {
      handleError(err, "Failed to reset entities:");
    } finally {
      loading.current = false;
      setLoadingState(false);
      setResetting(false);
    }
  }, [
    idling,
    fetchManyEntities,
    limit,
    sourceId,
    userId,
    followedOnly,
    sortBy,
    timeFrame,
    locationFilters,
    keywordsFilters,
    metadataFilters,
    titleFilters,
    contentFilters,
    attachmentsFilters,
  ]);

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => {
      return prevPage + 1;
    });
  };

  const filterEntities = (newEntities: Entity[], currentEntities: Entity[]) => {
    return newEntities.filter((entity) => {
      return !currentEntities.some((a) => a.id === entity.id);
    });
  };

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onReset?.();
      resetEntities();
    }, 800); // 800ms debounce delay

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [resetEntities, onReset]);

  // useEffect to get a new batch of entities
  useEffect(() => {
    const loadMoreEntities = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const newEntities = await fetchManyEntities({
          page,
          userId,
          sourceId,
          followedOnly,
          sortBy,
          limit,
          timeFrame,
          locationFilters,
          keywordsFilters,
          metadataFilters,
          titleFilters,
          contentFilters,
          attachmentsFilters,
        });

        if (newEntities) {
          setEntities((prevEntities) => {
            const filteredEntities = filterEntities(newEntities, prevEntities);
            return [...prevEntities, ...filteredEntities];
          });

          if (newEntities.length < limit) {
            hasMore.current = false;
            setHasMoreState(false);
          }
        }
      } catch (err) {
        handleError(err, "Loading more entities failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    // We only load more if th page changed
    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreEntities();
    }
  }, [page]);

  return {
    entities,
    infusedEntities,

    loading: loadingState,
    hasMore: hasMoreState,
    resetting,

    sortBy,
    setSortBy: (sortBy: EntityListSortByOptions) => setSortBy(sortBy),
    timeFrame,
    setTimeFrame: (timeFrame: TimeFrame | null) => setTimeFrame(timeFrame),

    sourceId,
    setSourceId,
    userId,
    setUserId: (userId: string | null) => setUserId(userId),
    followedOnly,
    setFollowedOnly: (state: boolean) => setFollowedOnly(state),
    keywordsFilters,
    updateKeywordsFilters,
    titleFilters,
    setTitleFilters: (newTitleFilters: TitleFilters | null) =>
      setTitleFilters(newTitleFilters),
    contentFilters,
    setContentFilters: (newContentFilters: ContentFilters | null) =>
      setContentFilters(newContentFilters),
    attachmentsFilters,
    setAttachmentsFilters: (newAttachmentsFilters: AttachmentsFilters | null) =>
      setAttachmentsFilters(newAttachmentsFilters),
    locationFilters,
    setLocationFilters: (location: LocationFilters | null) =>
      setLocationFilters(location),
    metadataFilters,
    setMetadataFilters: (newMetadataFilters: MetadataFilters | null) =>
      setMetadataFilters(newMetadataFilters),

    kickstart,
    loadMore,
    resetEntities,
    createEntity: handleCreateEntity,
    deleteEntity: handleDeleteEntity,
  };
}

export default useEntityListData;
