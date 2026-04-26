import { useEffect, useMemo, useCallback } from "react";
import { useReplykeDispatch, useReplykeSelector } from "../../store/hooks";

import {
  setProjectContext,
  selectCurrentCollection,
  selectSubCollections,
  selectCollectionsLoading,
  selectSubCollectionsMap,
  selectCurrentProjectId,
} from "../../store/slices/collectionsSlice";
import { useCollectionsActions } from "./useCollectionsActions";
import useProject from "../projects/useProject";
import { useUser } from "../user";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import type { Collection } from "../../interfaces/models/Collection";

export interface UseCollectionsProps {}

export interface CreateCollectionProps {
  collectionName: string;
}

export interface UpdateCollectionProps {
  collectionId: string;
  update: Partial<{ name: string }>;
}

export interface DeleteCollectionProps {
  collection: Collection;
}

export interface AddToCollectionProps {
  entityId: string;
}

export interface RemoveFromCollectionProps {
  entityId: string;
}

export interface UseCollectionsValues {
  currentCollection: Collection | null;
  subCollections: Collection[];
  loading: boolean;

  openCollection: (collection: Collection) => void;
  goBack: () => void;
  goToRoot: () => void;

  isEntitySaved: (props: {
    entityId: string;
    collectionId?: string;
  }) => Promise<{
    saved: boolean;
    inSpecificCollection?: boolean;
    collections: Array<{ id: string; name: string }>;
  }>;

  createCollection: (props: CreateCollectionProps) => Promise<void>;
  updateCollection: (props: UpdateCollectionProps) => Promise<void>;
  deleteCollection: (props: DeleteCollectionProps) => Promise<void>;
  addToCollection: (props: AddToCollectionProps) => Promise<void>;
  removeFromCollection: (props: RemoveFromCollectionProps) => Promise<void>;
}

/**
 * Redux-powered hook that provides the exact same interface as useCollectionsData()
 * This is a drop-in replacement for the Context-based hook
 */
function useCollections(_: UseCollectionsProps = {}): UseCollectionsValues {
  const dispatch = useReplykeDispatch();
  const axios = useAxiosPrivate();

  // Get external context
  const { projectId } = useProject();
  const { user } = useUser();

  // Get Redux state
  const currentCollection = useReplykeSelector(selectCurrentCollection);
  const subCollections = useReplykeSelector(selectSubCollections);
  const loading = useReplykeSelector(selectCollectionsLoading);
  const subCollectionsMap = useReplykeSelector(selectSubCollectionsMap);
  const collectionsById = useReplykeSelector(
    (state) => state.replyke.collections.collectionsById,
  );
  const currentProjectId = useReplykeSelector(selectCurrentProjectId);

  // Get actions
  const {
    openCollection,
    goBack,
    goToRoot,
    fetchRootCollection,
    fetchSubCollections,
    createCollection: createCollectionAction,
    updateCollection: updateCollectionAction,
    deleteCollection: deleteCollectionAction,
    addToCollection: addToCollectionAction,
    removeFromCollection: removeFromCollectionAction,
  } = useCollectionsActions();

  // Update Redux state when project changes
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      dispatch(setProjectContext(projectId));
    }
  }, [dispatch, projectId, currentProjectId]);

  // Fetch root collection when user and project are available.
  // Skip if a collection is already loaded for this project — otherwise mounting
  // useCollections() per leaf component (e.g. a BookmarkButton in every card)
  // hammers /collections/root and trips the rate limit.
  useEffect(() => {
    if (!user || !projectId) return;
    if (currentCollection && currentProjectId === projectId) return;

    fetchRootCollection({ projectId });
  }, [fetchRootCollection, user, projectId, currentCollection, currentProjectId]);

  // Fetch sub-collections when current collection changes
  useEffect(() => {
    if (!user || !projectId || !currentCollection) return;

    // Check if sub-collections for this collection are already fetched
    if (subCollectionsMap[currentCollection.id] !== undefined) {
      return; // No need to fetch, we already have the mapping (even if empty)
    }

    fetchSubCollections({ projectId, collectionId: currentCollection.id });
  }, [
    fetchSubCollections,
    user,
    projectId,
    currentCollection,
    subCollectionsMap,
  ]);

  // Entity membership checker - checks if entity is in any collection (or specific collection if provided)
  const isEntitySaved = useCallback(
    async ({ entityId: selectedEntityId, collectionId }: { entityId: string; collectionId?: string }) => {
      if (!projectId || !selectedEntityId) {
        return {
          saved: false,
          inSpecificCollection: collectionId ? false : undefined,
          collections: [],
        };
      }

      try {
        const response = await axios.get<{
          saved: boolean;
          collections: Array<{ id: string; name: string }>;
        }>(`/${projectId}/entities/is-entity-saved`, {
          params: { entityId: selectedEntityId },
        });

        // If specific collection ID provided, check if entity is in that collection
        const inSpecificCollection = collectionId
          ? response.data.collections.some((col) => col.id === collectionId)
          : undefined;

        return {
          saved: response.data.saved,
          inSpecificCollection,
          collections: response.data.collections,
        };
      } catch (err) {
        console.error("Error checking if entity is in collection:", err);
        return {
          saved: false,
          inSpecificCollection: collectionId ? false : undefined,
          collections: [],
        };
      }
    },
    [projectId, axios],
  );

  // Wrapped CRUD operations that match the original interface
  const handleCreateCollection = useCallback(
    async ({ collectionName }: CreateCollectionProps) => {
      if (!collectionName) {
        console.error("No collectionName provided.");
        return;
      }

      if (!currentCollection) {
        console.error("No current collection.");
        return;
      }

      if (!projectId) {
        console.error("No projectId available.");
        return;
      }

      await createCollectionAction({
        projectId,
        parentCollectionId: currentCollection.id,
        collectionName,
      });
    },
    [createCollectionAction, currentCollection, projectId],
  );

  const handleUpdateCollection = useCallback(
    async ({ collectionId, update }: UpdateCollectionProps) => {
      if (!projectId) {
        console.error("No projectId available.");
        return;
      }

      await updateCollectionAction({ projectId, collectionId, update });
    },
    [updateCollectionAction, projectId],
  );

  const handleDeleteCollection = useCallback(
    async ({ collection }: DeleteCollectionProps) => {
      if (!projectId) {
        console.error("No projectId available.");
        return;
      }

      await deleteCollectionAction({ projectId, collection });
    },
    [deleteCollectionAction, projectId],
  );

  const handleAddToCollection = useCallback(
    async ({ entityId }: AddToCollectionProps) => {
      if (!entityId) {
        console.error("No entityId provided.");
        return;
      }

      if (!currentCollection) {
        console.error("No current collection.");
        return;
      }

      if (!projectId) {
        console.error("No projectId available.");
        return;
      }

      await addToCollectionAction({
        projectId,
        collectionId: currentCollection.id,
        entityId,
      });
    },
    [addToCollectionAction, currentCollection, projectId],
  );

  const handleRemoveFromCollection = useCallback(
    async ({ entityId }: RemoveFromCollectionProps) => {
      if (!currentCollection) {
        console.error("No current collection.");
        return;
      }

      if (!projectId) {
        console.error("No projectId available.");
        return;
      }

      await removeFromCollectionAction({
        projectId,
        collectionId: currentCollection.id,
        entityId,
      });
    },
    [removeFromCollectionAction, currentCollection, projectId],
  );

  // Return the same interface as the original hook
  return useMemo(
    () => ({
      currentCollection,
      subCollections,
      loading,

      openCollection,
      goBack,
      goToRoot,

      isEntitySaved,

      createCollection: handleCreateCollection,
      updateCollection: handleUpdateCollection,
      deleteCollection: handleDeleteCollection,
      addToCollection: handleAddToCollection,
      removeFromCollection: handleRemoveFromCollection,
    }),
    [
      currentCollection,
      subCollections,
      loading,
      openCollection,
      goBack,
      goToRoot,
      isEntitySaved,
      handleCreateCollection,
      handleUpdateCollection,
      handleDeleteCollection,
      handleAddToCollection,
      handleRemoveFromCollection,
    ],
  );
}

export default useCollections;
