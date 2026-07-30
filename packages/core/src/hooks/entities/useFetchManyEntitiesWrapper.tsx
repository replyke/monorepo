import { useCallback, useEffect, useRef, useState } from "react";
import { EntityListSortByOptions, SortByReaction, SortDirection, SortType } from "../../interfaces/EntityListSortByOptions";
import { Entity, EntityIncludeParam } from "../../interfaces/models/Entity";
import { TimeFrame } from "../../interfaces/TimeFrame";
import { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";
import { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import { NsfwFilter } from "../../interfaces/NsfwFilter";
import { BlockedFilter } from "../../interfaces/BlockedFilter";
import useFetchManyEntities from "./useFetchManyEntities";
import { handleError } from "../../utils/handleError";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface UseFetchManyEntitiesWrapperProps extends SpaceReputationContextParams {
  userId?: string | null;
  limit?: number;
  sourceId?: string | null;
  spaceId?: string | null;
  followedOnly?: boolean;
  include?: EntityIncludeParam;
  defaultSortBy?: EntityListSortByOptions;
  defaultSortByReaction?: SortByReaction;
  defaultSortDir?: SortDirection;
  defaultSortType?: SortType;
  timeFrame?: TimeFrame | null;
  keywordsFilters?: KeywordsFilters | null;
  titleFilters?: TitleFilters | null;
  contentFilters?: ContentFilters | null;
  attachmentsFilters?: AttachmentsFilters | null;
  locationFilters?: LocationFilters | null;
  metadataFilters?: MetadataFilters | null;
  nsfwFilter?: NsfwFilter | null;
  blockedFilter?: BlockedFilter | null;
}

export interface UseFetchManyEntitiesWrapperValues {
  entities: Entity[];
  loading: boolean;
  hasMore: boolean;
  sortBy: EntityListSortByOptions;
  sortByReaction: SortByReaction;
  sortDir: SortDirection;
  sortType: SortType;
  setSortBy: (newSortBy: EntityListSortByOptions) => void;
  setSortByReaction: (newSortByReaction: SortByReaction) => void;
  setSortDir: (newSortDir: SortDirection) => void;
  setSortType: (newSortType: SortType) => void;
  loadMore: () => void;
}

function useFetchManyEntitiesWrapper(
  props: UseFetchManyEntitiesWrapperProps
): UseFetchManyEntitiesWrapperValues {
  const {
    userId,
    limit = 10,
    defaultSortBy = "createdAt",
    defaultSortByReaction = "upvote",
    defaultSortDir = "desc",
    defaultSortType = "auto",
    timeFrame,
    sourceId,
    spaceId,
    include,
    followedOnly,
    keywordsFilters,
    titleFilters,
    contentFilters,
    attachmentsFilters,
    locationFilters,
    metadataFilters,
    nsfwFilter,
    blockedFilter,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
  } = props;

  // Forwarded to the leaf fetcher, which flattens it via
  // buildSpaceReputationParams before it reaches the serializer.
  const reputation = { spaceReputation, spaceReputationId, spaceReputationDescendants };
  const reputationKey = JSON.stringify(reputation);

  const fetchManyEntities = useFetchManyEntities();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true);

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true);

  const [sortBy, setSortBy] = useState<EntityListSortByOptions>(defaultSortBy);
  const [sortByReaction, setSortByReaction] = useState<SortByReaction>(defaultSortByReaction);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);
  const [sortType, setSortType] = useState<SortType>(defaultSortType);
  const [page, setPage] = useState(1);
  const [entities, setEntities] = useState<Entity[]>([]);

  const resetEntities = useCallback(async () => {
    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);

      const response = await fetchManyEntities({
        userId,
        page: 1,
        sortBy,
        sortByReaction,
        sortDir,
        sortType,
        timeFrame,
        sourceId,
        spaceId,
        limit,
        include,
        followedOnly,
        keywordsFilters,
        titleFilters,
        contentFilters,
        attachmentsFilters,
        locationFilters,
        metadataFilters,
        nsfwFilter,
        blockedFilter,
        ...reputation,
      });

      if (response) {
        const { data: newEntities, pagination } = response;
        setEntities(newEntities);
        hasMore.current = pagination.hasMore;
        setHasMoreState(pagination.hasMore);
      }
    } catch (err) {
      handleError(err, "Failed to reset profile entities:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [
    fetchManyEntities,
    limit,
    sortBy,
    sortByReaction,
    sortDir,
    sortType,
    timeFrame,
    sourceId,
    spaceId,
    userId,
    include,
    followedOnly,
    keywordsFilters,
    titleFilters,
    contentFilters,
    attachmentsFilters,
    locationFilters,
    metadataFilters,
    nsfwFilter,
    blockedFilter,
    reputationKey,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => {
      return prevPage + 1;
    });
  };

  useEffect(() => {
    resetEntities();
  }, [resetEntities]);

  // useEffect to get a new batch of entities
  useEffect(() => {
    const loadMoreEntities = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const response = await fetchManyEntities({
          userId,
          page,
          sortBy,
          sortByReaction,
          sortDir,
          sortType,
          timeFrame,
          sourceId,
          spaceId,
          limit,
          include,
          followedOnly,
          keywordsFilters,
          titleFilters,
          contentFilters,
          attachmentsFilters,
          locationFilters,
          metadataFilters,
          nsfwFilter,
          ...reputation,
        });

        if (response) {
          const { data: newEntities, pagination } = response;
          setEntities((prevEntities) => [...prevEntities, ...newEntities]);
          hasMore.current = pagination.hasMore;
          setHasMoreState(pagination.hasMore);
        }
      } catch (err) {
        handleError(err, "Loading more entities failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    // We only load more if the page changed
    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreEntities();
    }
  }, [
    page,
    fetchManyEntities,
    userId,
    sortBy,
    sortByReaction,
    sortDir,
    sortType,
    timeFrame,
    sourceId,
    spaceId,
    limit,
    include,
    followedOnly,
    keywordsFilters,
    titleFilters,
    contentFilters,
    attachmentsFilters,
    locationFilters,
    metadataFilters,
    nsfwFilter,
    blockedFilter,
    reputationKey,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    entities,
    loading: loadingState,
    hasMore: hasMoreState,
    sortBy,
    sortByReaction,
    sortDir,
    sortType,
    setSortBy,
    setSortByReaction,
    setSortDir,
    setSortType,
    loadMore,
  };
}

export default useFetchManyEntitiesWrapper;
