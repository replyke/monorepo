import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { resetAccountScopedState } from "../actions";
import type { Collection } from "../../interfaces/models/Collection";
import type { Entity } from "../../interfaces/models/Entity";
import type { SublayState } from '../sublayReducers';

// State interface
export interface CollectionsState {
  // Single source of truth for all collections
  collectionsById: { [collectionId: string]: Collection };

  // Parent-child relationships mapping
  subcollectionsMap: { [parentId: string]: string[] };

  // Current navigation state
  currentCollectionId: string | null;

  // Navigation history (just IDs)
  collectionHistory: string[];

  // UI state
  loading: boolean;

  // Project context (needed for API calls)
  currentProjectId?: string;

  // Entity lists per collection (shared source of truth for optimistic updates)
  entitiesByCollectionId: Record<string, Entity[]>;
}

// Initial state
const initialState: CollectionsState = {
  collectionsById: {},
  subcollectionsMap: {},
  currentCollectionId: null,
  collectionHistory: [],
  loading: false,
  currentProjectId: undefined,
  entitiesByCollectionId: {},
};

// Create the slice
export const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    // Set the current project context
    setProjectContext: (state, action: PayloadAction<string>) => {
      state.currentProjectId = action.payload;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Navigation actions
    openCollection: (state, action: PayloadAction<Collection>) => {
      const collection = action.payload;

      // Store the collection if not already stored
      if (!state.collectionsById[collection.id]) {
        state.collectionsById[collection.id] = collection;
      }

      // Push current collection ID to history stack before opening new one
      if (state.currentCollectionId) {
        state.collectionHistory.push(state.currentCollectionId);
      }

      // Set new current collection ID
      state.currentCollectionId = collection.id;
    },

    goBack: (state) => {
      if (state.collectionHistory.length === 0) return;

      const previousCollectionId = state.collectionHistory.pop();
      if (!previousCollectionId) return;

      state.currentCollectionId = previousCollectionId;
    },

    goToRoot: (state) => {
      if (state.collectionHistory.length === 0) return;

      const rootCollectionId = state.collectionHistory[0];
      state.collectionHistory = [];
      state.currentCollectionId = rootCollectionId;
    },

    // Set current collection (for initial root collection fetch)
    setCurrentCollection: (state, action: PayloadAction<Collection | null>) => {
      const collection = action.payload;
      if (collection) {
        state.collectionsById[collection.id] = collection;
        state.currentCollectionId = collection.id;
      } else {
        state.currentCollectionId = null;
      }
    },

    // Set sub-collections and update mapping
    setSubCollections: (
      state,
      action: PayloadAction<{ collections: Collection[]; parentCollectionId: string }>
    ) => {
      const { collections, parentCollectionId } = action.payload;

      // Store all collections in collectionsById
      collections.forEach(collection => {
        state.collectionsById[collection.id] = collection;
      });

      // Update parent-child mapping
      state.subcollectionsMap[parentCollectionId] = collections.map(collection => collection.id);
    },

    // Update current collection (for entity add/remove operations)
    updateCurrentCollection: (state, action: PayloadAction<Collection>) => {
      const updatedCollection = action.payload;

      // Update in collectionsById (single source of truth)
      state.collectionsById[updatedCollection.id] = updatedCollection;
    },

    // Update a collection (now just updates in collectionsById)
    updateCollectionInSubCollections: (state, action: PayloadAction<Collection>) => {
      const updatedCollection = action.payload;

      // Update in collectionsById (single source of truth)
      state.collectionsById[updatedCollection.id] = updatedCollection;
    },

    // Add new collection to sub-collections and navigate to it
    addNewCollectionAndNavigate: (state, action: PayloadAction<Collection>) => {
      const newCollection = action.payload;

      if (!state.currentCollectionId) return;

      // Store the new collection
      state.collectionsById[newCollection.id] = newCollection;

      // Push current collection ID to history
      state.collectionHistory.push(state.currentCollectionId);

      // Set new collection as current
      state.currentCollectionId = newCollection.id;

      // Update parent-child mapping
      if (newCollection.parentId) {
        if (!state.subcollectionsMap[newCollection.parentId]) {
          state.subcollectionsMap[newCollection.parentId] = [];
        }
        if (!state.subcollectionsMap[newCollection.parentId].includes(newCollection.id)) {
          state.subcollectionsMap[newCollection.parentId].push(newCollection.id);
        }
      }
    },

    // Remove collection from sub-collections and storage
    removeCollectionFromSubCollections: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;

      // Remove from collectionsById
      delete state.collectionsById[collectionId];

      // Remove from all parent-child mappings
      Object.keys(state.subcollectionsMap).forEach((parentId) => {
        state.subcollectionsMap[parentId] = state.subcollectionsMap[parentId].filter(
          (id) => id !== collectionId
        );
      });

      // Remove its own sub-collections mapping if it exists
      delete state.subcollectionsMap[collectionId];
    },

    // Handle collection deletion
    handleCollectionDeletion: (
      state,
      action: PayloadAction<{ collectionId: string; parentId?: string | null }>
    ) => {
      const { collectionId, parentId } = action.payload;

      // Remove from parent-child mapping
      if (parentId && state.subcollectionsMap[parentId]) {
        state.subcollectionsMap[parentId] = state.subcollectionsMap[parentId].filter(
          (id) => id !== collectionId
        );
      }

      // Remove from collectionsById
      delete state.collectionsById[collectionId];

      // Remove its own sub-collections mapping
      delete state.subcollectionsMap[collectionId];

      // Remove its entity list
      delete state.entitiesByCollectionId[collectionId];

      // If deleted collection is current collection, go back
      if (state.currentCollectionId === collectionId) {
        if (state.collectionHistory.length === 0) {
          state.currentCollectionId = null;
          return;
        }

        const previousCollectionId = state.collectionHistory.pop();
        if (!previousCollectionId) {
          state.currentCollectionId = null;
          return;
        }

        state.currentCollectionId = previousCollectionId;
      }
    },

    // Entity list management (shared state for optimistic add/remove)
    setCollectionEntities: (
      state,
      action: PayloadAction<{ collectionId: string; entities: Entity[] }>
    ) => {
      const { collectionId, entities } = action.payload;
      state.entitiesByCollectionId[collectionId] = entities;
    },

    appendCollectionEntities: (
      state,
      action: PayloadAction<{ collectionId: string; entities: Entity[] }>
    ) => {
      const { collectionId, entities } = action.payload;
      if (!state.entitiesByCollectionId[collectionId]) {
        state.entitiesByCollectionId[collectionId] = [];
      }
      state.entitiesByCollectionId[collectionId].push(...entities);
    },

    prependCollectionEntity: (
      state,
      action: PayloadAction<{ collectionId: string; entity: Entity }>
    ) => {
      const { collectionId, entity } = action.payload;
      if (!state.entitiesByCollectionId[collectionId]) {
        state.entitiesByCollectionId[collectionId] = [];
      }
      state.entitiesByCollectionId[collectionId].unshift(entity);
    },

    removeCollectionEntity: (
      state,
      action: PayloadAction<{ collectionId: string; entityId: string }>
    ) => {
      const { collectionId, entityId } = action.payload;
      if (state.entitiesByCollectionId[collectionId]) {
        state.entitiesByCollectionId[collectionId] =
          state.entitiesByCollectionId[collectionId].filter((e) => e.id !== entityId);
      }
    },

    insertCollectionEntityAt: (
      state,
      action: PayloadAction<{ collectionId: string; entity: Entity; index: number }>
    ) => {
      const { collectionId, entity, index } = action.payload;
      if (!state.entitiesByCollectionId[collectionId]) {
        state.entitiesByCollectionId[collectionId] = [];
      }
      const clamped = Math.min(index, state.entitiesByCollectionId[collectionId].length);
      state.entitiesByCollectionId[collectionId].splice(clamped, 0, entity);
    },

    // Reset all collections data
    resetCollections: (state) => {
      state.collectionsById = {};
      state.subcollectionsMap = {};
      state.currentCollectionId = null;
      state.collectionHistory = [];
      state.loading = false;
      state.entitiesByCollectionId = {};
    },

    // Handle errors by stopping loading
    handleError: (state) => {
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    // Every hand-rolled slice returns to its initial state on an account
    // change. RTK-Query's cache is handled separately by
    // `baseApi.util.resetApiState()`; this covers what that does not.
    builder.addCase(resetAccountScopedState, () => initialState);
  },
});

// Export actions
export const {
  setProjectContext,
  setLoading,
  openCollection,
  goBack,
  goToRoot,
  setCurrentCollection,
  setSubCollections,
  updateCurrentCollection,
  updateCollectionInSubCollections,
  addNewCollectionAndNavigate,
  removeCollectionFromSubCollections,
  handleCollectionDeletion,
  setCollectionEntities,
  appendCollectionEntities,
  prependCollectionEntity,
  removeCollectionEntity,
  insertCollectionEntityAt,
  resetCollections,
  handleError,
} = collectionsSlice.actions;

// Export reducer
export default collectionsSlice.reducer;

// Selectors - use namespaced state for dual-mode support
export const selectCurrentCollection = (state: { sublay: SublayState }): Collection | null => {
  const { currentCollectionId, collectionsById } = state.sublay.collections;
  return currentCollectionId ? collectionsById[currentCollectionId] || null : null;
};

export const selectSubCollections = createSelector(
  [(state: { sublay: SublayState }) => state.sublay.collections.currentCollectionId,
   (state: { sublay: SublayState }) => state.sublay.collections.subcollectionsMap,
   (state: { sublay: SublayState }) => state.sublay.collections.collectionsById],
  (currentCollectionId, subcollectionsMap, collectionsById): Collection[] => {
    if (!currentCollectionId || !subcollectionsMap[currentCollectionId]) {
      return [];
    }

    return subcollectionsMap[currentCollectionId]
      .map(collectionId => collectionsById[collectionId])
      .filter(Boolean); // Remove any undefined entries
  }
);

export const selectCollectionsLoading = (state: { sublay: SublayState }) =>
  state.sublay.collections.loading;

export const selectCollectionHistory = createSelector(
  [(state: { sublay: SublayState }) => state.sublay.collections.collectionHistory,
   (state: { sublay: SublayState }) => state.sublay.collections.collectionsById],
  (collectionHistory, collectionsById): Collection[] => {
    return collectionHistory
      .map(collectionId => collectionsById[collectionId])
      .filter(Boolean); // Remove any undefined entries
  }
);

// Selector for the sub-collections mapping
export const selectSubCollectionsMap = (state: { sublay: SublayState }) =>
  state.sublay.collections.subcollectionsMap;

// Selector for all collections
export const selectCollectionsById = (state: { sublay: SublayState }) =>
  state.sublay.collections.collectionsById;

export const selectCurrentProjectId = (state: { sublay: SublayState }) =>
  state.sublay.collections.currentProjectId;

// Selector for current collection ID
export const selectCurrentCollectionId = (state: { sublay: SublayState }) =>
  state.sublay.collections.currentCollectionId;

const EMPTY_ENTITIES: Entity[] = [];

// Selector for entities in a specific collection
export const selectCollectionEntities =
  (collectionId: string | null | undefined) =>
  (state: { sublay: SublayState }): Entity[] =>
    collectionId
      ? (state.sublay.collections.entitiesByCollectionId[collectionId] ?? EMPTY_ENTITIES)
      : EMPTY_ENTITIES;
