import { useCallback, useMemo, useRef } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  setLoading,
  openCollection,
  goBack,
  goToRoot,
  setCurrentCollection,
  setSubCollections,
  updateCollectionInSubCollections,
  addNewCollectionAndNavigate,
  handleCollectionDeletion,
  prependCollectionEntity,
  removeCollectionEntity,
  insertCollectionEntityAt,
  resetCollections,
  handleError,
} from "../../store/slices/collectionsSlice";
import {
  useLazyFetchRootCollectionQuery,
  useLazyFetchSubCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useAddToCollectionMutation,
  useRemoveFromCollectionMutation,
} from "../../store/api/collectionsApi";
import { handleError as handleErrorUtil } from "../../utils/handleError";
import type { Collection } from "../../interfaces/models/Collection";
import type { Entity } from "../../interfaces/models/Entity";

export interface UseCollectionsActionsValues {
  openCollection: (collection: Collection) => void;
  goBack: () => void;
  goToRoot: () => void;
  fetchRootCollection: ({ projectId }: { projectId: string }) => Promise<void>;
  fetchSubCollections: ({ projectId, collectionId }: { projectId: string; collectionId: string }) => Promise<void>;
  createCollection: ({ projectId, parentCollectionId, collectionName }: { projectId: string; parentCollectionId: string; collectionName: string }) => Promise<void>;
  updateCollection: ({ projectId, collectionId, update }: { projectId: string; collectionId: string; update: { name: string } }) => Promise<void>;
  deleteCollection: ({ projectId, collection }: { projectId: string; collection: Collection }) => Promise<void>;
  addToCollection: ({ projectId, collectionId, entity }: { projectId: string; collectionId: string; entity: Entity }) => Promise<void>;
  removeFromCollection: ({ projectId, collectionId, entityId }: { projectId: string; collectionId: string; entityId: string }) => Promise<void>;
  resetCollections: () => void;
}

/**
 * Redux-powered hook that provides all collection actions
 * This replaces the individual hooks and provides a centralized way to manage collections
 */
export function useCollectionsActions(): UseCollectionsActionsValues {
  const dispatch = useSublayDispatch();

  // Use a ref so removeFromCollection can read the latest entities without being in deps
  const entitiesByCollectionId = useSublaySelector(
    (state) => state.sublay.collections.entitiesByCollectionId
  );
  const entitiesByCollectionIdRef = useRef(entitiesByCollectionId);
  entitiesByCollectionIdRef.current = entitiesByCollectionId;

  // RTK Query hooks
  const [fetchRootCollectionQuery] = useLazyFetchRootCollectionQuery();
  const [fetchSubCollectionsQuery] = useLazyFetchSubCollectionsQuery();
  const [createCollectionMutation] = useCreateCollectionMutation();
  const [updateCollectionMutation] = useUpdateCollectionMutation();
  const [deleteCollectionMutation] = useDeleteCollectionMutation();
  const [addToCollectionMutation] = useAddToCollectionMutation();
  const [removeFromCollectionMutation] = useRemoveFromCollectionMutation();

  // Navigation actions
  const openCollectionAction = useCallback((collection: Collection) => {
    dispatch(openCollection(collection));
  }, [dispatch]);

  const goBackAction = useCallback(() => {
    dispatch(goBack());
  }, [dispatch]);

  const goToRootAction = useCallback(() => {
    dispatch(goToRoot());
  }, [dispatch]);

  // Fetch root collection
  const fetchRootCollection = useCallback(async ({ projectId }: { projectId: string }) => {
    if (!projectId) {
      console.warn("Can't fetch root collection without projectId.");
      return;
    }

    dispatch(setLoading(true));

    try {
      const result = await fetchRootCollectionQuery({ projectId }).unwrap();
      if (result) {
        // Set parentId to null for root collection
        const rootCollection = { ...result, parentId: null };
        dispatch(setCurrentCollection(rootCollection));
      }
    } catch (err) {
      handleErrorUtil(err, "Failed fetching root collection");
      dispatch(handleError());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, fetchRootCollectionQuery]);

  // Fetch sub-collections
  const fetchSubCollections = useCallback(async ({ projectId, collectionId }: { projectId: string; collectionId: string }) => {
    if (!projectId || !collectionId) {
      console.warn("Can't fetch sub-collections without projectId and collectionId.");
      return;
    }

    dispatch(setLoading(true));

    try {
      const result = await fetchSubCollectionsQuery({ projectId, collectionId }).unwrap();
      if (result) {
        dispatch(setSubCollections({ collections: result, parentCollectionId: collectionId }));
      }
    } catch (err) {
      handleErrorUtil(err, "Failed fetching sub-collections");
      dispatch(handleError());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, fetchSubCollectionsQuery]);

  // Create collection
  const createCollection = useCallback(async ({
    projectId,
    parentCollectionId,
    collectionName,
  }: {
    projectId: string;
    parentCollectionId: string;
    collectionName: string;
  }): Promise<void> => {
    if (!projectId || !parentCollectionId || !collectionName) {
      console.error("Missing required parameters for creating collection.");
      return;
    }

    try {
      const result = await createCollectionMutation({
        projectId,
        parentCollectionId,
        collectionName,
      }).unwrap();

      if (result) {
        dispatch(addNewCollectionAndNavigate(result));
      }
    } catch (err) {
      handleErrorUtil(err, "Failed to create collection");
    }
  }, [createCollectionMutation, dispatch]);

  // Update collection
  const updateCollection = useCallback(async ({
    projectId,
    collectionId,
    update,
  }: {
    projectId: string;
    collectionId: string;
    update: { name: string };
  }): Promise<void> => {
    if (!projectId || !collectionId) {
      console.error("Missing required parameters for updating collection.");
      return;
    }

    try {
      const result = await updateCollectionMutation({
        projectId,
        collectionId,
        update,
      }).unwrap();

      if (result) {
        // Check if it's the current collection or a sub-collection
        dispatch(updateCollectionInSubCollections(result));
      }
    } catch (err) {
      handleErrorUtil(err, "Failed to update collection");
    }
  }, [updateCollectionMutation, dispatch]);

  // Delete collection
  const deleteCollection = useCallback(async ({
    projectId,
    collection,
  }: {
    projectId: string;
    collection: Collection;
  }): Promise<void> => {
    if (!projectId || !collection) {
      console.error("Missing required parameters for deleting collection.");
      return;
    }

    try {
      await deleteCollectionMutation({
        projectId,
        collectionId: collection.id,
      }).unwrap();

      dispatch(handleCollectionDeletion({ collectionId: collection.id, parentId: collection.parentId }));
    } catch (err) {
      handleErrorUtil(err, "Failed to delete collection");
    }
  }, [deleteCollectionMutation, dispatch]);

  // Add entity to collection — optimistically prepends to Redux state, reverts on error
  const addToCollection = useCallback(async ({
    projectId,
    collectionId,
    entity,
  }: {
    projectId: string;
    collectionId: string;
    entity: Entity;
  }): Promise<void> => {
    if (!projectId || !collectionId || !entity?.id) {
      console.error("Missing required parameters for adding to collection.");
      return;
    }

    dispatch(prependCollectionEntity({ collectionId, entity }));

    try {
      await addToCollectionMutation({
        projectId,
        collectionId,
        entityId: entity.id,
      }).unwrap();
    } catch (err) {
      dispatch(removeCollectionEntity({ collectionId, entityId: entity.id }));
      handleErrorUtil(err, "Failed to add entity to collection");
      throw err;
    }
  }, [addToCollectionMutation, dispatch]);

  // Remove entity from collection — optimistically removes from Redux state, reverts on error
  const removeFromCollection = useCallback(async ({
    projectId,
    collectionId,
    entityId,
  }: {
    projectId: string;
    collectionId: string;
    entityId: string;
  }): Promise<void> => {
    if (!projectId || !collectionId || !entityId) {
      console.error("Missing required parameters for removing from collection.");
      return;
    }

    const currentList = entitiesByCollectionIdRef.current[collectionId] ?? [];
    const originalIndex = currentList.findIndex((e) => e.id === entityId);
    const entityToRestore = originalIndex !== -1 ? currentList[originalIndex] : undefined;
    dispatch(removeCollectionEntity({ collectionId, entityId }));

    try {
      await removeFromCollectionMutation({
        projectId,
        collectionId,
        entityId,
      }).unwrap();
    } catch (err) {
      if (entityToRestore) {
        dispatch(insertCollectionEntityAt({ collectionId, entity: entityToRestore, index: originalIndex }));
      }
      handleErrorUtil(err, "Failed to remove entity from collection");
      throw err;
    }
  }, [removeFromCollectionMutation, dispatch]);

  // Reset collections
  const resetCollectionsAction = useCallback(() => {
    dispatch(resetCollections());
  }, [dispatch]);

  return useMemo(
    () => ({
      // Navigation
      openCollection: openCollectionAction,
      goBack: goBackAction,
      goToRoot: goToRootAction,

      // Data fetching
      fetchRootCollection,
      fetchSubCollections,

      // CRUD operations
      createCollection,
      updateCollection,
      deleteCollection,
      addToCollection,
      removeFromCollection,

      // Utility
      resetCollections: resetCollectionsAction,
    }),
    [
      openCollectionAction,
      goBackAction,
      goToRootAction,
      fetchRootCollection,
      fetchSubCollections,
      createCollection,
      updateCollection,
      deleteCollection,
      addToCollection,
      removeFromCollection,
      resetCollectionsAction,
    ]
  );
}

export default useCollectionsActions;