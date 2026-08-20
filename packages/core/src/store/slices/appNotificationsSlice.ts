import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { resetAccountScopedState } from "../actions";
import type { UnifiedAppNotification, NotificationTemplates } from "../../interfaces/models/AppNotification";
import type { SublayState } from '../sublayReducers';

// State interface
export interface AppNotificationsState {
  // Core data
  notifications: UnifiedAppNotification[];
  unreadCount: number;
  
  // UI state
  loading: boolean;
  hasMore: boolean;
  
  // Pagination
  page: number;
  limit: number;
  
  // Configuration
  notificationTemplates?: Partial<NotificationTemplates>;
  
  // Project context (needed for API calls)
  currentProjectId?: string;
}

// Initial state
const initialState: AppNotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,
  page: 1,
  limit: 10,
  notificationTemplates: undefined,
  currentProjectId: undefined,
};

// Create the slice
export const appNotificationsSlice = createSlice({
  name: 'appNotifications',
  initialState,
  reducers: {
    // Set the current project context
    setProjectContext: (state, action: PayloadAction<string>) => {
      state.currentProjectId = action.payload;
    },

    // Set pagination limit
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },

    // Set notification templates
    setNotificationTemplates: (state, action: PayloadAction<Partial<NotificationTemplates>>) => {
      state.notificationTemplates = action.payload;
    },

    // Reset notifications (clear all and restart pagination)
    resetNotifications: (state) => {
      state.notifications = [];
      state.page = 1;
      state.hasMore = true;
      state.loading = false;
    },

    // Load more notifications (increment page)
    loadMore: (state) => {
      if (state.hasMore && !state.loading) {
        state.page += 1;
      }
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Add new notifications (for pagination)
    addNotifications: (state, action: PayloadAction<{ notifications: UnifiedAppNotification[]; hasMore: boolean; isFirstPage?: boolean }>) => {
      const { notifications, hasMore, isFirstPage = false } = action.payload;

      if (isFirstPage) {
        state.notifications = notifications;
      } else {
        // Prevent duplicates when adding new pages
        const existingIds = new Set(state.notifications.map(n => n.id));
        const newNotifications = notifications.filter(n => !existingIds.has(n.id));
        state.notifications.push(...newNotifications);
      }

      // Update hasMore from pagination metadata
      state.hasMore = hasMore;

      state.loading = false;
    },

    // Mark notification as read locally (optimistic update)
    markAsReadLocally: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      
      if (notification && !notification.isRead) {
        notification.isRead = true;
        // Decrease unread count
        state.unreadCount = Math.max(state.unreadCount - 1, 0);
      }
    },

    // Mark all notifications as read locally (optimistic update)
    markAllAsReadLocally: (state) => {
      state.notifications.forEach(notification => {
        notification.isRead = true;
      });
      // Set unread count to 0
      state.unreadCount = 0;
    },

    // Set unread count
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
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
  setLimit,
  setNotificationTemplates,
  resetNotifications,
  loadMore,
  setLoading,
  addNotifications,
  markAsReadLocally,
  markAllAsReadLocally,
  setUnreadCount,
  handleError,
} = appNotificationsSlice.actions;

// Export reducer
export default appNotificationsSlice.reducer;

// Selectors - use namespaced state for dual-mode support
export const selectAppNotifications = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.notifications;

export const selectUnreadCount = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.unreadCount;

export const selectAppNotificationsLoading = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.loading;

export const selectAppNotificationsHasMore = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.hasMore;

export const selectAppNotificationsPage = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.page;

export const selectAppNotificationsLimit = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.limit;

export const selectNotificationTemplates = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.notificationTemplates;

export const selectCurrentProjectId = (state: { sublay: SublayState }) =>
  state.sublay.appNotifications.currentProjectId;