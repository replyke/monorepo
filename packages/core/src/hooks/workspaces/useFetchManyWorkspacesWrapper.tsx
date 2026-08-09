import { useCallback, useEffect, useRef, useState } from "react";
import { Workspace } from "../../interfaces/models/Workspace";
import useFetchManyWorkspaces from "./useFetchManyWorkspaces";
import { handleError } from "../../utils/handleError";

export interface UseFetchManyWorkspacesWrapperProps {
  limit?: number;
  include?: string;
}

export interface UseFetchManyWorkspacesWrapperValues {
  workspaces: Workspace[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Wrapper hook for the workspaces list (mirrors `useFetchManyEntitiesWrapper`).
 * Manages page state, accumulation, and load-more over the caller's
 * direct-membership + owned workspaces. NO Redux slice (house style — prefer the
 * Wrapper hook).
 */
function useFetchManyWorkspacesWrapper(
  props: UseFetchManyWorkspacesWrapperProps = {}
): UseFetchManyWorkspacesWrapperValues {
  const { limit = 10, include } = props;

  const fetchManyWorkspaces = useFetchManyWorkspaces();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true);

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true);

  const [page, setPage] = useState(1);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const resetWorkspaces = useCallback(async () => {
    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);

      const response = await fetchManyWorkspaces({ page: 1, limit, include });

      if (response) {
        const { data: newWorkspaces, pagination } = response;
        setWorkspaces(newWorkspaces);
        hasMore.current = pagination.hasMore;
        setHasMoreState(pagination.hasMore);
      }
    } catch (err) {
      handleError(err, "Failed to reset workspaces:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [fetchManyWorkspaces, limit, include]);

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => prevPage + 1);
  };

  useEffect(() => {
    resetWorkspaces();
  }, [resetWorkspaces]);

  useEffect(() => {
    const loadMoreWorkspaces = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const response = await fetchManyWorkspaces({ page, limit, include });

        if (response) {
          const { data: newWorkspaces, pagination } = response;
          setWorkspaces((prev) => [...prev, ...newWorkspaces]);
          hasMore.current = pagination.hasMore;
          setHasMoreState(pagination.hasMore);
        }
      } catch (err) {
        handleError(err, "Loading more workspaces failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreWorkspaces();
    }
  }, [page, fetchManyWorkspaces, limit, include]);

  return {
    workspaces,
    loading: loadingState,
    hasMore: hasMoreState,
    loadMore,
  };
}

export default useFetchManyWorkspacesWrapper;
