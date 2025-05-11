import { useCallback, useEffect, useRef, useState } from "react";

import { List } from "../../interfaces/models/List";
import useCreateList from "./useCreateList";
import useDeleteList from "./useDeleteList";
import useUpdateList from "./useUpdateList";
import useAddToList from "./useAddToList";
import useRemoveFromList from "./useRemoveFromList";
import useFetchRootList from "./useFetchRootList";
import useFetchSubLists from "./useFetchSubLists";
import { handleError } from "../../utils/handleError";
import useUser from "../users/useUser";

export interface UseListsDataProps {}
export interface UseListsDataValues {
  currentList: List | null;
  subLists: List[];
  loading: boolean;

  openList: (list: List) => void;
  goBack: () => void;
  goToRoot: () => void;

  isEntityInList: (selectedEntityId: string) => boolean;

  createList: (props: { listName: string }) => Promise<void>;
  updateList: (props: {
    listId: string;
    update: Partial<{ name: string }>;
  }) => Promise<void>;
  deleteList: (props: { list: List }) => Promise<void>;
  addToList: (props: { entityId: string }) => Promise<void>;
  removeFromList: (props: { entityId: string }) => Promise<void>;
}

function useListsData(_: UseListsDataProps): UseListsDataValues {
  const { user } = useUser();
  const [currentList, setCurrentList] = useState<List | null>(null);

  const [subLists, setSubLists] = useState<List[]>([]);

  const loading = useRef<boolean>(false);
  const [loadingState, setLoadingState] = useState(false);

  // Cache to store sub-lists for each list by their ID
  const subListCache = useRef<{ [listId: string]: List[] }>({});

  // Stack to keep track of list history
  const listHistory = useRef<List[]>([]);

  const openList = (list: List) => {
    setSubLists([]);
    if (currentList) {
      // Push the current list to the history stack before opening a new one
      listHistory.current.push(currentList);
    }
    setCurrentList(list);
  };

  const goBack = () => {
    if (listHistory.current.length === 0) return;

    const previousList = listHistory.current.pop();
    if (!previousList) return;
    setCurrentList(previousList);

    // Check if sub-lists for this list are already in the cache
    if (subListCache.current[previousList.id]) {
      setSubLists(subListCache.current[previousList.id]);
      return; // No need to fetch, we have cached data
    }
  };

  const goToRoot = () => {
    if (listHistory.current.length === 0) return;

    const rootList = listHistory.current[0];
    listHistory.current = [];
    setCurrentList(rootList);

    // Check if sub-lists for this list are already in the cache
    if (subListCache.current[rootList.id]) {
      setSubLists(subListCache.current[rootList.id]);
      return; // No need to fetch, we have cached data
    }
  };

  const isEntityInList = (selectedEntityId: string) => {
    return !!(
      currentList &&
      currentList.entityIds.some((entityId) => entityId === selectedEntityId)
    );
  };

  const fetchRootList = useFetchRootList();
  const fetchSubLists = useFetchSubLists();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const addToList = useAddToList();
  const removeFromList = useRemoveFromList();
  const deleteList = useDeleteList();

  const handleFetchRootList = useCallback(async () => {
    try {
      const list = await fetchRootList();
      if (list) setCurrentList({ ...list, parentId: null });
    } catch (err) {
      handleError(err, "Failed fetching root list");
    }
  }, [fetchRootList]);

  const handleFetchSubLists = useCallback(async () => {
    if (!currentList) {
      console.warn("Can't fetch sub-lists before fetching root list.");
      return;
    }

    // Check if sub-lists for this list are already in the cache
    if (subListCache.current[currentList.id]) {
      setSubLists(subListCache.current[currentList.id]);
      return; // No need to fetch, we have cached data
    }

    if (loading.current) return;

    loading.current = true;
    setLoadingState(true);

    try {
      const newSubLists = await fetchSubLists({ listId: currentList.id });
      if (newSubLists) {
        setSubLists(newSubLists);

        // Cache the fetched sub-lists
        subListCache.current[currentList.id] = newSubLists;
      }
    } catch (error) {
      handleError(error, "Failed fetching sub-lists");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [fetchSubLists, currentList]);

  const handleCreateList = useCallback(
    async ({ listName }: { listName: string }) => {
      if (!listName) {
        console.error("No entityId provided.");
        return;
      }

      if (!currentList) {
        console.error("No current list.");
        return;
      }

      try {
        const newList = await createList({
          listName,
          parentListId: currentList.id,
        });

        if (newList) {
          setSubLists([]);
          listHistory.current.push(currentList);

          setCurrentList(newList);
          // Update the cache for the current list
          if (currentList && subListCache.current[currentList.id]) {
            subListCache.current[currentList.id] = [
              ...(subListCache.current[currentList.id] || []),
              newList,
            ];
          }
        }
      } catch (err) {
        handleError(err, "Failed to create list");
      }
    },
    [createList, currentList]
  );

  const handleUpdateList = useCallback(
    async ({
      listId,
      update,
    }: {
      listId: string;
      update: Partial<{ name: string }>;
    }) => {
      try {
        const newList = await updateList({ listId, update });
        if (newList) {
          if (listId === currentList?.id) {
            setCurrentList(newList);
          } else {
            setSubLists((prevLists) =>
              prevLists.map((list) => (list.id === listId ? newList : list))
            );
          }
        }
      } catch (err) {
        handleError(err, "Failed to update list");
      }
    },
    [updateList, currentList]
  );

  const handleAddToList = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!entityId) {
        console.error("No entityId provided.");
        return;
      }

      if (!currentList) {
        console.error("No current list.");
        return;
      }
      try {
        const newList = await addToList({
          entityId,
          listId: currentList.id,
        });

        if (newList) {
          setCurrentList(newList);

          if (currentList.parentId) {
            const parentSubLists =
              subListCache.current[currentList.parentId] || [];
            // Update the subListCache with the new data for the current list
            subListCache.current[currentList.parentId] = parentSubLists.map(
              (list) => (list.id === newList.id ? newList : list)
            );
          }
        }
      } catch (err) {
        handleError(err, "Failed to add entity to lists: ");
      }
    },
    [currentList, addToList]
  );

  const handleRemoveFromList = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!currentList) {
        console.error("No current list.");
        return;
      }

      try {
        const newList = await removeFromList({
          entityId,
          listId: currentList.id,
        });
        if (newList) {
          setCurrentList(newList);

          if (currentList.parentId) {
            const parentSubLists =
              subListCache.current[currentList.parentId] || [];
            // Update the subListCache with the new data for the current list
            subListCache.current[currentList.parentId] = parentSubLists.map(
              (list) => (list.id === newList.id ? newList : list)
            );
          }
        }
      } catch (err) {
        handleError(err, "Failed to remove entity from lists: ");
      }
    },
    [removeFromList, currentList]
  );
  const handleDeleteList = useCallback(
    async ({ list }: { list: List }) => {
      try {
        await deleteList({ listId: list.id });

        // Update the cache by removing the deleted list from its parent's sub-list cache
        if (list.parentId && subListCache.current[list.parentId]) {
          const filteredSubLists = subListCache.current[list.parentId].filter(
            (cachedList) => cachedList.id !== list.id
          );

          subListCache.current[list.parentId] = filteredSubLists;
        }

        if (list.id === currentList?.id) {
          goBack();
        } else {
          setSubLists((prevLists) => prevLists.filter((f) => f.id !== list.id));
        }
      } catch (err) {
        handleError(err, "Failed to delete list");
      }
    },
    [deleteList, currentList]
  );

  useEffect(() => {
    if (!user) return;

    handleFetchRootList();
  }, [handleFetchRootList, user]);

  useEffect(() => {
    handleFetchSubLists();
  }, [handleFetchSubLists]);

  return {
    currentList,
    subLists,
    loading: loadingState,

    openList,
    goBack,
    goToRoot,

    isEntityInList,

    createList: handleCreateList,
    updateList: handleUpdateList,
    addToList: handleAddToList,
    removeFromList: handleRemoveFromList,
    deleteList: handleDeleteList,
  };
}

export default useListsData;
