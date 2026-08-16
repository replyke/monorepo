import { baseApi } from "./baseApi";
import type {
  Space,
  DeleteSpaceResponse,
} from "../../interfaces/models/Space";
import type { SpaceListSortByOptions } from "../../interfaces/SpaceListSortByOptions";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";

// This module exists solely to back the space-list feature (`useSpaceList` /
// `useSpaceListActions`). Every other spaces operation is served by the public
// axios hooks in `hooks/spaces/` — do not add endpoints here to mirror them.

// ===== API Parameter Types =====

interface CreateSpaceParams {
  projectId: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  avatar?: string | null;
  banner?: string | null;
  readingPermission?: "anyone" | "members";
  postingPermission?: "anyone" | "members" | "admins";
  visibility?: "public" | "unlisted" | "private";
  requireJoinApproval?: boolean;
  metadata?: Record<string, any>;
  parentSpaceId?: string | null;
}

interface FetchSpacesParams {
  projectId: string;
  page?: number;
  limit?: number;
  sortBy?: SpaceListSortByOptions;
  searchSlug?: string | null;
  searchName?: string | null;
  searchDescription?: string | null;
  searchAny?: string | null;
  readingPermission?: "anyone" | "members" | null;
  memberOf?: boolean;
  parentSpaceId?: string | null;
}

interface DeleteSpaceParams {
  projectId: string;
  spaceId: string;
}

// ===== API Endpoints =====

export const spacesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Create a new space
    createSpace: builder.mutation<Space, CreateSpaceParams>({
      query: ({ projectId, ...body }) => ({
        url: `/${projectId}/spaces`,
        method: "POST",
        body,
      }),
      invalidatesTags: () => [{ type: "Space", id: "LIST" }],
    }),

    // Fetch many spaces (list with filters)
    fetchSpaces: builder.query<PaginatedResponse<Space>, FetchSpacesParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.page !== undefined) queryParams.append("page", params.page.toString());
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params.searchSlug) queryParams.append("searchSlug", params.searchSlug);
        if (params.searchName) queryParams.append("searchName", params.searchName);
        if (params.searchDescription) queryParams.append("searchDescription", params.searchDescription);
        if (params.searchAny) queryParams.append("searchAny", params.searchAny);
        if (params.readingPermission) queryParams.append("readingPermission", params.readingPermission);
        // memberOf is an opt-in flag: the server only accepts the literal "true".
        // Sending "false" (the default) fails validation with a 400. Use a strict
        // === true check so a stray non-boolean (no runtime type enforcement) can't
        // be coerced into wrongly opting in.
        if (params.memberOf === true) queryParams.append("memberOf", "true");
        if (params.parentSpaceId !== undefined) {
          // Convert null to "null" string for API
          queryParams.append("parentSpaceId", params.parentSpaceId === null ? "null" : params.parentSpaceId);
        }

        return {
          url: `/${projectId}/spaces?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) => [
        { type: "Space", id: "LIST" },
        ...(result?.data?.map(({ id }) => ({ type: "Space" as const, id })) ?? []),
      ],
    }),

    // Delete space
    deleteSpace: builder.mutation<DeleteSpaceResponse, DeleteSpaceParams>({
      query: ({ projectId, spaceId }) => ({
        url: `/${projectId}/spaces/${spaceId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { spaceId }) => [
        { type: "Space", id: spaceId },
        { type: "Space", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useCreateSpaceMutation,
  useFetchSpacesQuery,
  useLazyFetchSpacesQuery,
  useDeleteSpaceMutation,
} = spacesApi;

// Export for manual cache management
export const { createSpace, fetchSpaces, deleteSpace } = spacesApi.endpoints;
