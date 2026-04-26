import { baseApi } from "./baseApi";
import type { Space, SpaceDetailed, SpacePreview } from "../../interfaces/models/Space";
import type { SpaceMember } from "../../interfaces/models/SpaceMember";
import type { SpaceBreadcrumb } from "../../interfaces/SpaceBreadcrumb";
import type { SpaceListSortByOptions } from "../../interfaces/SpaceListSortByOptions";

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

interface FetchSpaceParams {
  projectId: string;
  spaceId: string;
}

interface FetchSpaceByShortIdParams {
  projectId: string;
  shortId: string;
}

interface FetchSpaceBySlugParams {
  projectId: string;
  slug: string;
}

interface UpdateSpaceParams {
  projectId: string;
  spaceId: string;
  update: Partial<{
    name: string;
    slug: string | null;
    description: string | null;
    avatar: string | null;
    banner: string | null;
    readingPermission: "anyone" | "members";
    postingPermission: "anyone" | "members" | "admins";
    requireJoinApproval: boolean;
    metadata: Record<string, any>;
  }>;
}

interface DeleteSpaceParams {
  projectId: string;
  spaceId: string;
}

interface DeleteSpaceResponse {
  message: string;
  deletedCounts: {
    entities: number;
    members: number;
    childSpaces: number;
  };
}

interface FetchSpaceChildrenParams {
  projectId: string;
  spaceId: string;
  page?: number;
  limit?: number;
}

interface FetchSpaceBreadcrumbParams {
  projectId: string;
  spaceId: string;
}

interface JoinSpaceParams {
  projectId: string;
  spaceId: string;
}

interface LeaveSpaceParams {
  projectId: string;
  spaceId: string;
}

interface FetchSpaceMembersParams {
  projectId: string;
  spaceId: string;
  page?: number;
  limit?: number;
  role?: "admin" | "moderator" | "member";
  status?: "pending" | "active" | "banned" | "rejected";
}

interface FetchUserSpacesParams {
  projectId: string;
  page?: number;
  limit?: number;
  status?: "active" | "pending" | "banned";
  role?: string; // Single role or comma-separated: "admin,moderator"
  all?: boolean;
}

interface UpdateMemberRoleParams {
  projectId: string;
  spaceId: string;
  memberId: string;
  role: "admin" | "moderator" | "member";
}

interface ApproveMemberParams {
  projectId: string;
  spaceId: string;
  memberId: string;
}

interface DeclineMemberParams {
  projectId: string;
  spaceId: string;
  memberId: string;
}

interface RemoveMemberParams {
  projectId: string;
  spaceId: string;
  memberId: string;
}

interface UnbanMemberParams {
  projectId: string;
  spaceId: string;
  memberId: string;
}

// ===== API Endpoints =====

export const spacesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ===== CRUD Operations =====

    // Create a new space
    createSpace: builder.mutation<Space, CreateSpaceParams>({
      query: ({ projectId, ...body }) => ({
        url: `/${projectId}/spaces`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { parentSpaceId }) => [
        { type: "Space", id: "LIST" },
        // Invalidate parent's children list if creating under a parent
        ...(parentSpaceId
          ? [{ type: "Space" as const, id: `${parentSpaceId}-CHILDREN` }]
          : []),
      ],
    }),

    // Fetch many spaces (list with filters)
    fetchSpaces: builder.query<Space[], FetchSpacesParams>({
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
        if (params.memberOf !== undefined) queryParams.append("memberOf", params.memberOf.toString());
        if (params.parentSpaceId !== undefined) {
          // Convert null to "null" string for API
          queryParams.append("parentSpaceId", params.parentSpaceId === null ? "null" : params.parentSpaceId);
        }

        return {
          url: `/${projectId}/spaces?${queryParams.toString()}`,
          method: "GET",
        };
      },
      // API returns { data: Space[], pagination }; unwrap so consumers get Space[].
      transformResponse: (response: { data: Space[] } | Space[]) =>
        Array.isArray(response) ? response : response.data,
      providesTags: (result) => [
        { type: "Space", id: "LIST" },
        ...(result?.map(({ id }) => ({ type: "Space" as const, id })) ?? []),
      ],
    }),

    // Fetch single space by ID (returns detailed space with memberPermissions, parentSpace, childSpaces)
    fetchSpace: builder.query<SpaceDetailed, FetchSpaceParams>({
      query: ({ projectId, spaceId }) => ({
        url: `/${projectId}/spaces/${spaceId}`,
        method: "GET",
      }),
      providesTags: (result, error, { spaceId }) => [
        { type: "Space", id: spaceId },
      ],
    }),

    // Fetch space by shortId (returns detailed space)
    fetchSpaceByShortId: builder.query<SpaceDetailed, FetchSpaceByShortIdParams>({
      query: ({ projectId, shortId }) => ({
        url: `/${projectId}/spaces/by-short-id?shortId=${shortId}`,
        method: "GET",
      }),
      providesTags: (result) => [
        ...(result ? [{ type: "Space" as const, id: result.id }] : []),
      ],
    }),

    // Fetch space by slug (returns detailed space)
    fetchSpaceBySlug: builder.query<SpaceDetailed, FetchSpaceBySlugParams>({
      query: ({ projectId, slug }) => ({
        url: `/${projectId}/spaces/by-slug?slug=${slug}`,
        method: "GET",
      }),
      providesTags: (result) => [
        ...(result ? [{ type: "Space" as const, id: result.id }] : []),
      ],
    }),

    // Update space (returns detailed space)
    updateSpace: builder.mutation<SpaceDetailed, UpdateSpaceParams>({
      query: ({ projectId, spaceId, update }) => ({
        url: `/${projectId}/spaces/${spaceId}`,
        method: "PATCH",
        body: update,
      }),
      // Optimistically update the cache
      async onQueryStarted(
        { projectId, spaceId, update },
        { dispatch, queryFulfilled }
      ) {
        const patches: any[] = [];

        // Update in fetchSpace query
        patches.push(
          dispatch(
            spacesApi.util.updateQueryData(
              "fetchSpace",
              { projectId, spaceId },
              (draft) => {
                Object.assign(draft, update);
              }
            )
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on failure
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { spaceId }) => [
        { type: "Space", id: spaceId },
        { type: "Space", id: "LIST" },
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
        // Invalidate children queries as they're cascade deleted
        { type: "Space", id: `${spaceId}-CHILDREN` },
      ],
    }),

    // ===== Hierarchy Operations =====

    // Fetch child spaces
    fetchSpaceChildren: builder.query<Space[], FetchSpaceChildrenParams>({
      query: ({ projectId, spaceId, page = 1, limit = 20 }) => ({
        url: `/${projectId}/spaces/${spaceId}/children?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: (result, error, { spaceId }) => [
        { type: "Space", id: `${spaceId}-CHILDREN` },
        ...(result?.map(({ id }) => ({ type: "Space" as const, id })) ?? []),
      ],
    }),

    // Fetch space breadcrumb
    fetchSpaceBreadcrumb: builder.query<SpaceBreadcrumb, FetchSpaceBreadcrumbParams>({
      query: ({ projectId, spaceId }) => ({
        url: `/${projectId}/spaces/${spaceId}/breadcrumb`,
        method: "GET",
      }),
      providesTags: (result, error, { spaceId }) => [
        { type: "Space", id: `${spaceId}-BREADCRUMB` },
      ],
    }),

    // ===== Membership Operations =====

    // Join a space
    joinSpace: builder.mutation<SpaceMember, JoinSpaceParams>({
      query: ({ projectId, spaceId }) => ({
        url: `/${projectId}/spaces/${spaceId}/join`,
        method: "POST",
      }),
      // Optimistically update member count and member permissions
      async onQueryStarted(
        { projectId, spaceId },
        { dispatch, queryFulfilled }
      ) {
        const patches: any[] = [];

        // Update space query to increment member count and add memberPermissions
        patches.push(
          dispatch(
            spacesApi.util.updateQueryData(
              "fetchSpace",
              { projectId, spaceId },
              (draft) => {
                draft.membersCount += 1;
                // Note: memberPermissions will be updated with actual data from response
              }
            )
          )
        );

        try {
          const { data: member } = await queryFulfilled;

          // Update with actual member data
          dispatch(
            spacesApi.util.updateQueryData(
              "fetchSpace",
              { projectId, spaceId },
              (draft) => {
                // Filter out "rejected" status as it's not valid for memberPermissions
                const status = member.status === "rejected" ? null : member.status;
                draft.memberPermissions = {
                  isAdmin: member.role === "admin",
                  isModerator: member.role === "moderator" || member.role === "admin",
                  isMember: member.status === "active",
                  status,
                  canPost: member.status === "active",
                  canModerate: member.role === "moderator" || member.role === "admin",
                  canRead: true,
                };
              }
            )
          );
        } catch {
          // Revert optimistic update on failure
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { spaceId }) => [
        { type: "Space", id: spaceId },
        { type: "SpaceMember", id: spaceId },
      ],
    }),

    // Leave a space
    leaveSpace: builder.mutation<void, LeaveSpaceParams>({
      query: ({ projectId, spaceId }) => ({
        url: `/${projectId}/spaces/${spaceId}/leave`,
        method: "DELETE",
      }),
      // Optimistically update member count and member permissions
      async onQueryStarted(
        { projectId, spaceId },
        { dispatch, queryFulfilled }
      ) {
        const patches: any[] = [];

        // Update space query to decrement member count and remove memberPermissions
        patches.push(
          dispatch(
            spacesApi.util.updateQueryData(
              "fetchSpace",
              { projectId, spaceId },
              (draft) => {
                draft.membersCount = Math.max(0, draft.membersCount - 1);
                draft.memberPermissions = null;
              }
            )
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on failure
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, { spaceId }) => [
        { type: "Space", id: spaceId },
        { type: "SpaceMember", id: spaceId },
      ],
    }),

    // Fetch space members
    fetchSpaceMembers: builder.query<SpaceMember[], FetchSpaceMembersParams>({
      query: ({ projectId, spaceId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.page !== undefined) queryParams.append("page", params.page.toString());
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.role) queryParams.append("role", params.role);
        if (params.status) queryParams.append("status", params.status);

        return {
          url: `/${projectId}/spaces/${spaceId}/members?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result, error, { spaceId }) => [
        { type: "SpaceMember", id: spaceId },
        ...(result?.map(({ id }) => ({ type: "SpaceMember" as const, id })) ?? []),
      ],
    }),

    // Fetch user's spaces
    fetchUserSpaces: builder.query<Space[], FetchUserSpacesParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.page !== undefined) queryParams.append("page", params.page.toString());
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.status) queryParams.append("status", params.status);
        if (params.role) queryParams.append("role", params.role);
        if (params.all) queryParams.append("all", "true");

        const queryString = queryParams.toString();
        return {
          url: `/${projectId}/spaces/user-spaces${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) => [
        { type: "Space", id: "USER-SPACES" },
        ...(result?.map(({ id }) => ({ type: "Space" as const, id })) ?? []),
      ],
    }),

    // Update member role (admin only)
    updateMemberRole: builder.mutation<SpaceMember, UpdateMemberRoleParams>({
      query: ({ projectId, spaceId, memberId, role }) => ({
        url: `/${projectId}/spaces/${spaceId}/members/${memberId}/role`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (result, error, { spaceId, memberId }) => [
        { type: "SpaceMember", id: spaceId },
        { type: "SpaceMember", id: memberId },
      ],
    }),

    // Approve pending member (moderator+)
    approveMember: builder.mutation<SpaceMember, ApproveMemberParams>({
      query: ({ projectId, spaceId, memberId }) => ({
        url: `/${projectId}/spaces/${spaceId}/members/${memberId}/approve`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, { spaceId, memberId }) => [
        { type: "SpaceMember", id: spaceId },
        { type: "SpaceMember", id: memberId },
      ],
    }),

    // Decline pending member (moderator+)
    declineMember: builder.mutation<SpaceMember, DeclineMemberParams>({
      query: ({ projectId, spaceId, memberId }) => ({
        url: `/${projectId}/spaces/${spaceId}/members/${memberId}/decline`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, { spaceId, memberId }) => [
        { type: "SpaceMember", id: spaceId },
        { type: "SpaceMember", id: memberId },
      ],
    }),

    // Remove/ban member (moderator+)
    removeMember: builder.mutation<void, RemoveMemberParams>({
      query: ({ projectId, spaceId, memberId }) => ({
        url: `/${projectId}/spaces/${spaceId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { spaceId, memberId }) => [
        { type: "SpaceMember", id: spaceId },
        { type: "SpaceMember", id: memberId },
        { type: "Space", id: spaceId }, // Update member count
      ],
    }),

    // Unban a banned member (moderator+)
    unbanMember: builder.mutation<SpaceMember, UnbanMemberParams>({
      query: ({ projectId, spaceId, memberId }) => ({
        url: `/${projectId}/spaces/${spaceId}/members/${memberId}/unban`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, { spaceId, memberId }) => [
        { type: "SpaceMember", id: spaceId },
        { type: "SpaceMember", id: memberId },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useCreateSpaceMutation,
  useFetchSpacesQuery,
  useLazyFetchSpacesQuery,
  useFetchSpaceQuery,
  useLazyFetchSpaceQuery,
  useFetchSpaceByShortIdQuery,
  useLazyFetchSpaceByShortIdQuery,
  useFetchSpaceBySlugQuery,
  useLazyFetchSpaceBySlugQuery,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useFetchSpaceChildrenQuery,
  useLazyFetchSpaceChildrenQuery,
  useFetchSpaceBreadcrumbQuery,
  useLazyFetchSpaceBreadcrumbQuery,
  useJoinSpaceMutation,
  useLeaveSpaceMutation,
  useFetchSpaceMembersQuery,
  useLazyFetchSpaceMembersQuery,
  useFetchUserSpacesQuery,
  useLazyFetchUserSpacesQuery,
  useUpdateMemberRoleMutation,
  useApproveMemberMutation,
  useDeclineMemberMutation,
  useRemoveMemberMutation,
  useUnbanMemberMutation,
} = spacesApi;

// Export for manual cache management
export const {
  createSpace,
  fetchSpaces,
  fetchSpace,
  fetchSpaceByShortId,
  fetchSpaceBySlug,
  updateSpace,
  deleteSpace,
  fetchSpaceChildren,
  fetchSpaceBreadcrumb,
  joinSpace,
  leaveSpace,
  fetchSpaceMembers,
  fetchUserSpaces,
  updateMemberRole,
  approveMember,
  declineMember,
  removeMember,
  unbanMember,
} = spacesApi.endpoints;
