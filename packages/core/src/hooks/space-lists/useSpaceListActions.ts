import { useCallback } from "react";
import { useSublayDispatch } from "../../store/hooks";
import {
  setSpaceListLoading,
  setSpaceListSpaces,
  setSpaceListHasMore,
  setSpaceListError,
  addSpace,
  removeSpace,
} from "../../store/slices/spaceListsSlice";
import {
  useLazyFetchSpacesQuery,
  useCreateSpaceMutation,
  useDeleteSpaceMutation,
} from "../../store/api/spacesApi";
import { handleError as handleErrorUtil } from "../../utils/handleError";
import useProject from "../projects/useProject";
import type {
  Space,
  ReadingPermission,
  PostingPermission,
} from "../../interfaces/models/Space";
import type { SpaceListSortByOptions } from "../../interfaces/SpaceListSortByOptions";

export interface FetchSpacesOptions {
  page: number;
  sortBy: SpaceListSortByOptions;
  searchSlug?: string | null;
  searchName?: string | null;
  searchDescription?: string | null;
  searchAny?: string | null;
  memberOf?: boolean;
  parentSpaceId?: string | null;
  limit: number;
}

export interface CreateSpaceOptions {
  name: string;
  slug?: string | null;
  description?: string | null;
  // Space images are multipart-only on the server; set them with
  // `useCreateSpace` / `useUpdateSpace` rather than through the list actions.
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  requireJoinApproval?: boolean;
  metadata?: Record<string, any>;
  parentSpaceId?: string | null;
  insertPosition?: "first" | "last";
}

export interface DeleteSpaceOptions {
  spaceId: string;
}

export function useSpaceListActions() {
  const dispatch = useSublayDispatch();

  // Get project context
  const { projectId } = useProject();

  // RTK Query hooks
  const [triggerFetchSpaces] = useLazyFetchSpacesQuery();
  const [createSpaceMutation] = useCreateSpaceMutation();
  const [deleteSpaceMutation] = useDeleteSpaceMutation();

  // Fetch spaces action
  const fetchSpaces = useCallback(
    async (
      listId: string,
      options: FetchSpacesOptions
    ): Promise<Space[] | null> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      if (!options.sortBy) {
        console.warn("sortBy is required for fetching spaces");
        return null;
      }

      dispatch(setSpaceListLoading({ listId, loading: true }));

      try {
        const result = await triggerFetchSpaces({
          projectId,
          page: options.page,
          sortBy: options.sortBy,
          searchSlug: options.searchSlug,
          searchName: options.searchName,
          searchDescription: options.searchDescription,
          searchAny: options.searchAny,
          memberOf: options.memberOf,
          parentSpaceId: options.parentSpaceId,
          limit: options.limit,
        }).unwrap();

        if (result) {
          const append = options.page > 1;
          dispatch(setSpaceListSpaces({ listId, spaces: result.data, append }));
          dispatch(
            setSpaceListHasMore({
              listId,
              hasMore: result.pagination.hasMore,
            })
          );
          return result.data;
        }

        return null;
      } catch (err) {
        console.error(
          `[SpaceListActions] Failed to fetch spaces for listId: ${listId}`,
          err
        );
        handleErrorUtil(err, "Failed to fetch spaces:");
        dispatch(
          setSpaceListError({ listId, error: "Failed to fetch spaces" })
        );
        throw err;
      } finally {
        dispatch(setSpaceListLoading({ listId, loading: false }));
      }
    },
    [dispatch, projectId, triggerFetchSpaces]
  );

  // Create space action
  const createSpace = useCallback(
    async (
      listId: string,
      options: CreateSpaceOptions
    ): Promise<Space | undefined> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      if (!options.name) {
        throw new Error("Space name is required");
      }

      try {
        const { insertPosition, ...createData } = options;

        const newSpace = await createSpaceMutation({
          projectId,
          ...createData,
        }).unwrap();

        // Optimistically add to the list
        dispatch(
          addSpace({
            listId,
            space: newSpace,
            insertPosition: insertPosition || "first",
          })
        );

        return newSpace;
      } catch (err) {
        console.error(
          `[SpaceListActions] Failed to create space for listId: ${listId}`,
          err
        );
        handleErrorUtil(err, "Failed to create space:");
        throw err;
      }
    },
    [dispatch, projectId, createSpaceMutation]
  );

  // Delete space action
  const deleteSpace = useCallback(
    async (listId: string, options: DeleteSpaceOptions): Promise<void> => {
      if (!projectId) {
        throw new Error("No project ID available");
      }

      if (!options.spaceId) {
        throw new Error("Space ID is required");
      }

      try {
        await deleteSpaceMutation({
          projectId,
          spaceId: options.spaceId,
        }).unwrap();

        // Remove from the list
        dispatch(
          removeSpace({
            listId,
            spaceId: options.spaceId,
          })
        );
      } catch (err) {
        console.error(
          `[SpaceListActions] Failed to delete space for listId: ${listId}`,
          err
        );
        handleErrorUtil(err, "Failed to delete space:");
        throw err;
      }
    },
    [dispatch, projectId, deleteSpaceMutation]
  );

  return {
    fetchSpaces,
    createSpace,
    deleteSpace,
  };
}

export default useSpaceListActions;
