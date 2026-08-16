import { baseApi } from "./baseApi";
import type { Collection } from "../../interfaces/models/Collection";
import type { Entity } from "../../interfaces/models/Entity";

// API parameters types
interface FetchRootCollectionParams {
  projectId: string;
}

interface FetchSubCollectionsParams {
  projectId: string;
  collectionId: string;
}

interface FetchCollectionEntitiesParams {
  projectId: string;
  collectionId: string;
  page?: number;
  limit?: number;
  sortBy?: "new" | "top" | "hot" | "added";
  sortDir?: "asc" | "desc";
  include?: string | string[];
}

interface FetchCollectionEntitiesResponse {
  data: Entity[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

interface CreateCollectionParams {
  projectId: string;
  parentCollectionId: string;
  collectionName: string;
}

interface UpdateCollectionParams {
  projectId: string;
  collectionId: string;
  update: { name: string };
}

interface DeleteCollectionParams {
  projectId: string;
  collectionId: string;
}

interface AddToCollectionParams {
  projectId: string;
  collectionId: string;
  entityId: string;
}

interface AddToCollectionResponse {
  success: boolean;
  collection: {
    id: string;
    entityCount: number;
  };
}

interface RemoveFromCollectionParams {
  projectId: string;
  collectionId: string;
  entityId: string;
}

interface RemoveFromCollectionResponse {
  success: boolean;
  collection: {
    id: string;
    entityCount: number;
  };
}

// Extended API with collections endpoints
export const collectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch root collection
    fetchRootCollection: builder.query<Collection, FetchRootCollectionParams>({
      query: ({ projectId }) => ({
        url: `/${projectId}/collections/root`,
        method: "GET",
      }),
      providesTags: (result, error, { projectId }) => [
        { type: "Collection" as const, id: `${projectId}-ROOT` },
        ...(result ? [{ type: "Collection" as const, id: result.id }] : []),
      ],
    }),

    // Fetch sub-collections for a parent collection
    fetchSubCollections: builder.query<Collection[], FetchSubCollectionsParams>({
      query: ({ projectId, collectionId }) => ({
        url: `/${projectId}/collections/${collectionId}/sub-collections`,
        method: "GET",
      }),
      providesTags: (result, error, { projectId, collectionId }) => [
        { type: "Collection" as const, id: `${projectId}-${collectionId}-SUBS` },
        ...(result?.map(({ id }) => ({
          type: "Collection" as const,
          id,
        })) ?? []),
      ],
    }),

    // Fetch paginated entities in a collection
    fetchCollectionEntities: builder.query<FetchCollectionEntitiesResponse, FetchCollectionEntitiesParams>({
      query: ({ projectId, collectionId, page, limit, sortBy, sortDir, include }) => ({
        url: `/${projectId}/collections/${collectionId}/entities`,
        method: "GET",
        params: {
          page,
          limit,
          sortBy,
          sortDir,
          include: Array.isArray(include) ? include.join(',') : include,
        },
      }),
      providesTags: (result, error, { collectionId }) => [
        { type: "CollectionEntities" as const, id: collectionId },
      ],
    }),

    // Create a new sub-collection
    createCollection: builder.mutation<Collection, CreateCollectionParams>({
      query: ({ projectId, parentCollectionId, collectionName }) => ({
        url: `/${projectId}/collections/${parentCollectionId}/sub-collections`,
        method: "POST",
        body: { collectionName },
      }),
      invalidatesTags: (result, error, { projectId, parentCollectionId }) => [
        { type: "Collection" as const, id: `${projectId}-${parentCollectionId}-SUBS` },
        ...(result ? [{ type: "Collection" as const, id: result.id }] : []),
      ],
    }),

    // Update collection properties (flat structure - matches space update pattern)
    updateCollection: builder.mutation<Collection, UpdateCollectionParams>({
      query: ({ projectId, collectionId, update }) => ({
        url: `/${projectId}/collections/${collectionId}`,
        method: "PATCH",
        body: update,
      }),
      // Optimistically update the cache
      async onQueryStarted(
        { projectId, collectionId, update },
        { dispatch, queryFulfilled }
      ) {
        // Update in all relevant queries
        const patches: any[] = [];

        // Update root collection if it's the one being updated
        patches.push(
          dispatch(
            collectionsApi.util.updateQueryData(
              "fetchRootCollection",
              { projectId },
              (draft) => {
                if (draft && draft.id === collectionId) {
                  if (update.name !== undefined) {
                    draft.name = update.name;
                  }
                }
              }
            )
          )
        );

        // Update in sub-collections queries (we need to find which parent contains this collection)
        // This is a simplified approach - in a real app you might want more sophisticated cache management
        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on failure
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { collectionId }) => [
        { type: "Collection" as const, id: collectionId },
      ],
    }),

    // Delete a collection
    deleteCollection: builder.mutation<void, DeleteCollectionParams>({
      query: ({ projectId, collectionId }) => ({
        url: `/${projectId}/collections/${collectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId, collectionId }) => [
        { type: "Collection" as const, id: collectionId },
        // Invalidate all sub-collections queries since we don't know which parent this belonged to
        { type: "Collection" as const, id: `${projectId}-SUBS-ALL` },
      ],
    }),

    // Add entity to collection (POST - create relationship)
    addToCollection: builder.mutation<AddToCollectionResponse, AddToCollectionParams>({
      query: ({ projectId, collectionId, entityId }) => ({
        url: `/${projectId}/collections/${collectionId}/entities`,
        method: "POST",
        body: { entityId },
      }),
      invalidatesTags: (result, error, { collectionId }) => [
        { type: "Collection" as const, id: collectionId },
        { type: "CollectionEntities" as const, id: collectionId },
      ],
    }),

    // Remove entity from collection (DELETE - remove relationship)
    removeFromCollection: builder.mutation<RemoveFromCollectionResponse, RemoveFromCollectionParams>({
      query: ({ projectId, collectionId, entityId }) => ({
        url: `/${projectId}/collections/${collectionId}/entities/${entityId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { collectionId }) => [
        { type: "Collection" as const, id: collectionId },
        { type: "CollectionEntities" as const, id: collectionId },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useFetchRootCollectionQuery,
  useLazyFetchRootCollectionQuery,
  useFetchSubCollectionsQuery,
  useLazyFetchSubCollectionsQuery,
  useFetchCollectionEntitiesQuery,
  useLazyFetchCollectionEntitiesQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useAddToCollectionMutation,
  useRemoveFromCollectionMutation,
} = collectionsApi;

// Export for manual cache management
export const {
  fetchRootCollection,
  fetchSubCollections,
  fetchCollectionEntities,
  createCollection,
  updateCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
} = collectionsApi.endpoints;