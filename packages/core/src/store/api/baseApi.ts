import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/env";
import { getAuthorizedToken } from "../../config/authGate";

// Type for state that includes sublay namespace
// Used by prepareHeaders to access auth token from namespaced state
interface StateWithSublay {
  sublay: {
    auth: {
      accessToken: string | null;
    };
  };
}

// Base query that uses the current project context and auth
const createBaseQuery = () => {
  return fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    prepareHeaders: async (headers, { getState }) => {
      // Add Content-Type header
      headers.set('Content-Type', 'application/json');

      // Get access token from namespaced Redux state
      const state = getState() as StateWithSublay;
      const stateToken = state.sublay?.auth?.accessToken ?? null;

      // Wait for the auth bootstrap before deciding whether there is a token,
      // and rotate one that is about to expire. Without this, a query firing on
      // mount is cached under an args-only key with whatever the server returns
      // to a stranger — and RTK Query has no reason to refetch when the token
      // lands, since the args never changed. Resolves immediately once auth is
      // ready, and instantly when no provider armed the gate (unit tests,
      // direct `baseApi` dispatches).
      const accessToken = await getAuthorizedToken(stateToken);

      // Add Authorization header if we have a token
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      return headers;
    },
  });
};

// Create the base API slice
export const baseApi = createApi({
  reducerPath: 'sublayApi',
  baseQuery: createBaseQuery(),
  tagTypes: [
    'AppNotification',
    'Collection',
    'CollectionEntities',
    'User',
    'Entity',
    'Space',
    'SpaceMember',
    'TableRow',
    'NotificationPreferences',
    // Future tag types:
    // 'Comment',
  ],
  endpoints: () => ({}), // Endpoints will be injected by feature APIs
});

// Export hooks for use in components (will be populated by injected endpoints)
export const {} = baseApi;

// Exports for integration mode (users who have their own Redux store)
export const sublayApiReducer = baseApi.reducer;
export const sublayApiMiddleware = baseApi.middleware;