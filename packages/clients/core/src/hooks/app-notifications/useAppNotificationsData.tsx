import { useCallback, useEffect, useRef, useState } from "react";
import useFetchAppNotifications from "./useFetchAppNotifications";
import useCountUnreadNotifications from "./useCountUnreadNotifications";
import {
  NotificationTemplates,
  UnifiedAppNotification,
} from "../../interfaces/models/AppNotification";
import useMarkNotificationAsRead from "./useMarkNotificationAsRead";
import { handleError } from "../../utils/handleError";
import addNotificationsMessages from "../../helpers/addNotificationsMessages";

export interface UseAppNotificationsDataProps {
  limit?: number;
  notificationTemplates?: Partial<NotificationTemplates>;
}

export interface UseAppNotificationsDataValues {
  appNotifications: UnifiedAppNotification[];
  unreadAppNotificationsCount: number;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  resetAppNotifications: () => Promise<void>;
}

function useAppNotificationsData({
  limit = 10,
  notificationTemplates,
}: UseAppNotificationsDataProps): UseAppNotificationsDataValues {
  const [appNotifications, setAppNotifications] = useState<
    UnifiedAppNotification[]
  >([]);
  const [unreadAppNotificationsCount, setUnreadAppNotificationsCount] =
    useState(0);
  const [page, setPage] = useState(1);

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true);

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true);

  const fetchAppNotifications = useFetchAppNotifications();

  const countUnreadNotifications = useCountUnreadNotifications();

  const markNotificationAsRead = useMarkNotificationAsRead();

  const resetAppNotifications = useCallback(async () => {
    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);
      setAppNotifications([]);

      const newAppNotifications = await fetchAppNotifications({
        page: 1,
        limit,
      });

      if (newAppNotifications) {
        const completeNotifications = addNotificationsMessages(
          newAppNotifications,
          notificationTemplates
        );

        setAppNotifications(completeNotifications);

        if (newAppNotifications.length < limit) {
          hasMore.current = false;
          setHasMoreState(false);
        }
      }
    } catch (err) {
      handleError(err, "Failed to refesh notifications:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [fetchAppNotifications, limit, notificationTemplates]);

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => {
      return prevPage + 1;
    });
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setUnreadAppNotificationsCount((prevCount) => Math.max(prevCount - 1, 0));
      setAppNotifications((prevNotifs) =>
        prevNotifs.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      handleError(err, "Failed to mark notification as read:");
    }
  };

  // Check how many unread notifications we have
  useEffect(() => {
    (async () => {
      const newCount = await countUnreadNotifications();
      if (typeof newCount === "number")
        setUnreadAppNotificationsCount(newCount);
    })();
  }, [countUnreadNotifications]);

  useEffect(() => {
    resetAppNotifications?.();
  }, [resetAppNotifications]);

  // useEffect to get a new batch of app notifications
  useEffect(() => {
    const loadMoreNotifications = async () => {
      try {
        loading.current = true;

        const newAppNotifications = await fetchAppNotifications({
          page,
          limit,
        });

        if (newAppNotifications) {
          const completeNotifications = addNotificationsMessages(
            newAppNotifications,
            notificationTemplates
          );

          setAppNotifications((prevEntities) => {
            return [...prevEntities, ...completeNotifications];
          });

          if (newAppNotifications.length < limit) {
            hasMore.current = false;
          }
        }
      } catch (err) {
        handleError(err, "Loading more app notifications failed:");
      } finally {
        loading.current = false;
      }
    };

    // We only load more if the page changed
    // We rmoved this  && hasMore.current && !loading.current because i caused us to skip page 2 (as request came to soon). Still not sure if it's issue that we don't check if we're loading
    // Maybe we can do something with debounce? So it will only allow the page state to increase by 1 until it finsihed loading?
    // EDIT: 've added it back aftr checking that indeed this is the issue. Let's keep it safe and find a way to fix it after
    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreNotifications();
    }
  }, [page]);

  return {
    appNotifications,
    unreadAppNotificationsCount,
    loading: loadingState,
    hasMore: hasMoreState,
    loadMore,
    markNotificationAsRead: handleMarkNotificationAsRead,
    resetAppNotifications,
  };
}

export default useAppNotificationsData;
