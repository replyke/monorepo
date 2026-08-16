import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import type { SublayState } from '../sublayReducers';
import { Space } from "../../interfaces/models/Space";
import { SpaceListSortByOptions } from "../../interfaces/SpaceListSortByOptions";

// Individual space list state
export interface SpaceListState {
  spaces: Space[];
  page: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  lastFetched: number | null;

  // Configuration (set when fetchSpaces is called)
  limit: number;

  // Filter/sort state (user-controlled filters only)
  sortBy: SpaceListSortByOptions;
  searchSlug: string | null;
  searchName: string | null;
  searchDescription: string | null;
  searchAny: string | null;
  memberOf: boolean;
  parentSpaceId: string | null;
}

// Root state for all space lists
export interface SpaceListsState {
  lists: { [listId: string]: SpaceListState };
}

// Default state for a new space list
const createDefaultSpaceListState = (): SpaceListState => ({
  spaces: [],
  page: 1,
  loading: true,
  hasMore: true,
  error: null,
  lastFetched: null,

  // Default configuration
  limit: 20,

  // Default filters (user-controlled only)
  sortBy: "newest",
  searchSlug: null,
  searchName: null,
  searchDescription: null,
  searchAny: null,
  memberOf: false,
  parentSpaceId: undefined as any, // Will be set when fetchSpaces is called
});

// Initial state
const initialState: SpaceListsState = {
  lists: {},
};

// Space list filters interface - used by both Redux slice and hooks
export interface SpaceListFilters {
  sortBy?: SpaceListSortByOptions;
  searchSlug?: string | null;
  searchName?: string | null;
  searchDescription?: string | null;
  searchAny?: string | null;
  memberOf?: boolean;
  parentSpaceId?: string | null;
}

// Configuration for space list operations
export interface SpaceListConfig {
  limit?: number;
}

// Options for space list operations
export interface SpaceListFetchOptions {
  resetUnspecified?: boolean; // Reset any unspecified filters to their defaults
  fetchImmediately?: boolean; // Skip debouncing, fetch immediately (used by hooks)
  clearImmediately?: boolean; // Clear spaces immediately before fetch starts
}

// Filter update payload interface
export interface FilterUpdatePayload {
  listId: string;
  filters: Partial<SpaceListFilters>;
  config?: SpaceListConfig;
  options?: SpaceListFetchOptions;
}

// Initialize list payload interface
export interface InitializeListPayload {
  listId: string;
}

// Space operations payload interfaces
export interface SpaceAddPayload {
  listId: string;
  space: Space;
  insertPosition?: "first" | "last";
}

export interface SpaceRemovePayload {
  listId: string;
  spaceId: string;
}

export interface SpaceUpdatePayload {
  listId: string;
  spaceId: string;
  updates: Partial<Space>;
}

export interface SpacesSetPayload {
  listId: string;
  spaces: Space[];
  append?: boolean;
}

// Create the slice
export const spaceListsSlice = createSlice({
  name: "spaceLists",
  initialState,
  reducers: {
    // Initialize or get existing list
    initializeList: (state, action: PayloadAction<InitializeListPayload>) => {
      const { listId } = action.payload;
      if (!state.lists[listId]) {
        state.lists[listId] = createDefaultSpaceListState();
      }
    },

    // Update filters and sort (unified function)
    updateFilters: (state, action: PayloadAction<FilterUpdatePayload>) => {
      const { listId, filters, options } = action.payload;

      // Ensure list exists
      if (!state.lists[listId]) {
        state.lists[listId] = createDefaultSpaceListState();
      }

      const list = state.lists[listId];

      // If resetUnspecified is true, reset to defaults first
      if (options?.resetUnspecified) {
        const defaultState = createDefaultSpaceListState();
        // Reset all filter properties to defaults
        list.sortBy = defaultState.sortBy;
        list.searchSlug = defaultState.searchSlug;
        list.searchName = defaultState.searchName;
        list.searchDescription = defaultState.searchDescription;
        list.searchAny = defaultState.searchAny;
        list.memberOf = defaultState.memberOf;
        list.parentSpaceId = defaultState.parentSpaceId;
      }

      // Update specified filters
      Object.keys(filters).forEach((key) => {
        if (filters[key as keyof typeof filters] !== undefined) {
          (list as any)[key] = filters[key as keyof typeof filters];
        }
      });

      // Update config if provided
      if (action.payload.config) {
        if (action.payload.config.limit !== undefined) {
          list.limit = action.payload.config.limit;
        }
      }

      // Reset pagination when filters change
      list.page = 1;
      list.hasMore = true;
      list.error = null;
    },

    // Set loading state for space list
    setSpaceListLoading: (
      state,
      action: PayloadAction<{ listId: string; loading: boolean }>
    ) => {
      const { listId, loading } = action.payload;
      if (state.lists[listId]) {
        state.lists[listId].loading = loading;
      }
    },

    // Set spaces for space list
    setSpaceListSpaces: (state, action: PayloadAction<SpacesSetPayload>) => {
      const { listId, spaces, append = false } = action.payload;

      if (!state.lists[listId]) {
        state.lists[listId] = createDefaultSpaceListState();
      }

      const list = state.lists[listId];

      if (append) {
        // Filter out duplicates when appending
        const existingIds = new Set(list.spaces.map((s) => s.id));
        const newSpaces = spaces.filter((s) => !existingIds.has(s.id));
        list.spaces = [...list.spaces, ...newSpaces];
      } else {
        list.spaces = spaces;
      }

      list.loading = false;
      list.lastFetched = Date.now();

      // Note: hasMore is set explicitly by the caller based on limit from hook props
    },

    // Increment page for load more
    incrementPage: (state, action: PayloadAction<string>) => {
      const listId = action.payload;
      if (state.lists[listId]) {
        state.lists[listId].page += 1;
      }
    },

    // Set hasMore for space list
    setSpaceListHasMore: (
      state,
      action: PayloadAction<{ listId: string; hasMore: boolean }>
    ) => {
      const { listId, hasMore } = action.payload;
      if (state.lists[listId]) {
        state.lists[listId].hasMore = hasMore;
      }
    },

    // Set error for space list
    setSpaceListError: (
      state,
      action: PayloadAction<{ listId: string; error: string | null }>
    ) => {
      const { listId, error } = action.payload;
      if (state.lists[listId]) {
        state.lists[listId].error = error;
        state.lists[listId].loading = false;
      }
    },

    // Add space
    addSpace: (state, action: PayloadAction<SpaceAddPayload>) => {
      const { listId, space, insertPosition = "first" } = action.payload;

      if (!state.lists[listId]) return;

      const list = state.lists[listId];

      if (insertPosition === "last") {
        list.spaces.push(space);
      } else {
        list.spaces.unshift(space);
      }
    },

    // Remove space
    removeSpace: (state, action: PayloadAction<SpaceRemovePayload>) => {
      const { listId, spaceId } = action.payload;

      if (!state.lists[listId]) return;

      const list = state.lists[listId];
      list.spaces = list.spaces.filter((s) => s.id !== spaceId);
    },

    // Update space
    updateSpace: (state, action: PayloadAction<SpaceUpdatePayload>) => {
      const { listId, spaceId, updates } = action.payload;

      if (!state.lists[listId]) return;

      const list = state.lists[listId];
      const spaceIndex = list.spaces.findIndex((s) => s.id === spaceId);

      if (spaceIndex !== -1) {
        list.spaces[spaceIndex] = {
          ...list.spaces[spaceIndex],
          ...updates,
        };
      }
    },

    // Clean up unused lists (for memory management)
    cleanupList: (state, action: PayloadAction<string>) => {
      const listId = action.payload;
      delete state.lists[listId];
    },

    // Clean up old lists (older than TTL)
    cleanupOldLists: (state, action: PayloadAction<number>) => {
      const ttl = action.payload; // TTL in milliseconds
      const now = Date.now();

      Object.keys(state.lists).forEach((listId) => {
        const list = state.lists[listId];
        if (list.lastFetched && now - list.lastFetched > ttl) {
          delete state.lists[listId];
        }
      });
    },
  },
});

// Export actions
export const {
  initializeList,
  updateFilters,
  setSpaceListLoading,
  setSpaceListSpaces,
  incrementPage,
  setSpaceListHasMore,
  setSpaceListError,
  addSpace,
  removeSpace,
  updateSpace,
  cleanupList,
  cleanupOldLists,
} = spaceListsSlice.actions;

// Base selectors - use namespaced state for dual-mode support
const selectSpaceListsState = (state: { sublay: SublayState }) =>
  state.sublay.spaceLists;
const selectListId = (_: { sublay: SublayState }, listId: string) => listId;

// Memoized selectors using createSelector
export const selectSpaceList = createSelector(
  [selectSpaceListsState, selectListId],
  (spaceListsState, listId): SpaceListState | undefined =>
    spaceListsState.lists[listId]
);

export const selectSpaceListSpaces = createSelector(
  [selectSpaceList],
  (spaceList): Space[] => spaceList?.spaces || []
);

export const selectSpaceListLoading = createSelector(
  [selectSpaceList],
  (spaceList): boolean => spaceList?.loading || false
);

export const selectSpaceListHasMore = createSelector(
  [selectSpaceList],
  (spaceList): boolean => spaceList?.hasMore || false
);

export const selectSpaceListFilters = createSelector(
  [selectSpaceList],
  (spaceList) => {
    if (!spaceList) return null;

    return {
      sortBy: spaceList.sortBy,
      searchSlug: spaceList.searchSlug,
      searchName: spaceList.searchName,
      searchDescription: spaceList.searchDescription,
      searchAny: spaceList.searchAny,
      memberOf: spaceList.memberOf,
      parentSpaceId: spaceList.parentSpaceId,
    };
  }
);

export const selectSpaceListConfig = createSelector(
  [selectSpaceList],
  (spaceList): { limit: number } | null => {
    if (!spaceList) return null;

    return {
      limit: spaceList.limit,
    };
  }
);

export default spaceListsSlice.reducer;
