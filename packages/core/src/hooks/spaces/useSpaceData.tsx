import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useFetchSpace from "./useFetchSpace";
import useFetchSpaceByShortId from "./useFetchSpaceByShortId";
import useFetchSpaceBySlug from "./useFetchSpaceBySlug";
import useFetchSpaceBreadcrumb from "./useFetchSpaceBreadcrumb";
import useUpdateSpace, { UpdateSpaceProps } from "./useUpdateSpace";
import useDeleteSpace from "./useDeleteSpace";
import useJoinSpace from "./useJoinSpace";
import useLeaveSpace from "./useLeaveSpace";
import useSpacePermissions from "./useSpacePermissions";

import {
  SpaceDetailed,
  SpaceIncludeParam,
  SpacePreview,
} from "../../interfaces/models/Space";
import { SpaceMemberStatus } from "../../interfaces/models/SpaceMember";
import { handleError } from "../../utils/handleError";

export interface UseSpaceDataProps {
  space?: SpaceDetailed;
  spaceId?: string | undefined | null;
  shortId?: string | undefined | null;
  slug?: string | undefined | null;
  include?: SpaceIncludeParam;
}

export interface UseSpaceDataValues {
  space: SpaceDetailed | null | undefined;
  setSpace: React.Dispatch<React.SetStateAction<SpaceDetailed | null | undefined>>;

  // Permissions
  isMember: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canPost: boolean;
  canModerate: boolean;
  canRead: boolean;
  membershipStatus: SpaceMemberStatus | null;
  isPending: boolean;
  isBanned: boolean;

  // Hierarchy
  breadcrumb: SpacePreview[];
  parentSpace: SpacePreview | null;
  childSpaces: SpacePreview[];

  // Operations
  updateSpace(
    props: Pick<UpdateSpaceProps, "update">
  ): Promise<SpaceDetailed | undefined>;
  deleteSpace: () => Promise<void>;
  joinSpace: () => Promise<void>;
  leaveSpace: () => Promise<void>;

  // State
  loading: boolean;
  error: string | null;
}

function useSpaceData({
  spaceId,
  shortId,
  slug,
  space: spaceProp,
  include,
}: UseSpaceDataProps): UseSpaceDataValues {
  const [space, setSpace] = useState<SpaceDetailed | undefined | null>(spaceProp);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<SpacePreview[]>([]);

  // Cache to store fetched spaces keyed by unique identifier
  const spaceCache = useRef<Record<string, SpaceDetailed>>({});

  // Fetch hooks
  const fetchSpace = useFetchSpace();
  const fetchSpaceByShortId = useFetchSpaceByShortId();
  const fetchSpaceBySlug = useFetchSpaceBySlug();
  const fetchSpaceBreadcrumb = useFetchSpaceBreadcrumb();

  // Operation hooks
  const updateSpaceHook = useUpdateSpace();
  const deleteSpaceHook = useDeleteSpace();
  const joinSpaceHook = useJoinSpace();
  const leaveSpaceHook = useLeaveSpace();

  // Stabilize include param to prevent infinite loops when passed as inline array
  const stableInclude = useMemo(
    () => include,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(include)]
  );

  // Compute permissions
  const permissions = useSpacePermissions({
    memberPermissions: space?.memberPermissions,
    postingPermission: space?.postingPermission || "members",
    readingPermission: space?.readingPermission || "anyone",
  });

  // Handle space update
  const handleUpdateSpace = useCallback(
    async ({ update }: Pick<UpdateSpaceProps, "update">) => {
      if (!space) return;
      try {
        const newSpace = await updateSpaceHook({
          spaceId: space.id,
          update,
        });
        if (newSpace) setSpace(newSpace);
        return newSpace;
      } catch (err) {
        handleError(err, "Failed to update space");
        setError("Failed to update space");
      }
    },
    [space, updateSpaceHook]
  );

  // Handle space delete
  const handleDeleteSpace = useCallback(async () => {
    if (!space) return;

    try {
      await deleteSpaceHook({ spaceId: space.id });
      setSpace(undefined);
    } catch (err) {
      handleError(err, "Failed to delete space");
      setError("Failed to delete space");
    }
  }, [space, deleteSpaceHook]);

  // Handle join space
  const handleJoinSpace = useCallback(async () => {
    if (!space) return;

    try {
      const response = await joinSpaceHook({ spaceId: space.id });
      const member = response.membership;

      // Update space with new memberPermissions and member count
      // Note: When joining, role is always "member", status is "pending" or "active"
      setSpace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          membersCount: prev.membersCount + 1,
          memberPermissions: {
            isAdmin: false,
            isModerator: false,
            isMember: member.status === "active",
            status: member.status,
            canPost: member.status === "active",
            canModerate: false,
            canRead: true,
          },
        };
      });
    } catch (err) {
      handleError(err, "Failed to join space");
      setError("Failed to join space");
    }
  }, [space, joinSpaceHook]);

  // Handle leave space
  const handleLeaveSpace = useCallback(async () => {
    if (!space) return;

    try {
      await leaveSpaceHook({ spaceId: space.id });

      // Update space to remove memberPermissions and decrement member count
      setSpace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          membersCount: Math.max(0, prev.membersCount - 1),
          memberPermissions: null,
        };
      });
    } catch (err) {
      handleError(err, "Failed to leave space");
      setError("Failed to leave space");
    }
  }, [space, leaveSpaceHook]);

  // Fetch space effect
  useEffect(() => {
    const handleFetchSpace = async () => {
      if (!spaceId && !shortId && !slug) return;

      // If space is already loaded with matching ID, skip fetch
      if (space && spaceId && space.id === spaceId) return;
      if (space && shortId && space.shortId === shortId) return;
      if (space && slug && space.slug === slug) return;

      const uniqueKey = `${spaceId ?? ""}-${shortId ?? ""}-${slug ?? ""}`;

      // If we have a cached space, update the state and exit
      if (spaceCache.current[uniqueKey]) {
        setSpace(spaceCache.current[uniqueKey]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let fetchedSpace: SpaceDetailed | null = null;

        if (spaceId) {
          fetchedSpace = await fetchSpace({ spaceId, include: stableInclude });
        } else if (shortId) {
          fetchedSpace = await fetchSpaceByShortId({ shortId, include: stableInclude });
        } else if (slug) {
          fetchedSpace = await fetchSpaceBySlug({ slug, include: stableInclude });
        }

        if (fetchedSpace) {
          // Store the fetched space in cache
          spaceCache.current[uniqueKey] = fetchedSpace;
          setSpace(fetchedSpace);
        } else {
          setSpace(null);
        }
      } catch (err) {
        handleError(err, "Failed to fetch space");
        setError("Failed to fetch space");
        setSpace(null);
      } finally {
        setLoading(false);
      }
    };

    handleFetchSpace();
  }, [
    fetchSpace,
    fetchSpaceByShortId,
    fetchSpaceBySlug,
    spaceId,
    shortId,
    slug,
    space,
    stableInclude,
  ]);

  // Fetch breadcrumb effect
  useEffect(() => {
    const handleFetchBreadcrumb = async () => {
      if (!space?.id) {
        setBreadcrumb([]);
        return;
      }

      try {
        const breadcrumbData = await fetchSpaceBreadcrumb({
          spaceId: space.id,
        });
        setBreadcrumb(breadcrumbData.breadcrumb);
      } catch (err) {
        // Breadcrumb is not critical, just log the error
        handleError(err, "Failed to fetch space breadcrumb");
        setBreadcrumb([]);
      }
    };

    handleFetchBreadcrumb();
  }, [space?.id, fetchSpaceBreadcrumb]);

  // Update space when prop changes
  useEffect(() => {
    if (spaceProp) setSpace(spaceProp);
  }, [spaceProp]);

  return {
    space,
    setSpace,

    // Permissions
    isMember: permissions.isMember,
    isAdmin: permissions.isAdmin,
    isModerator: permissions.isModerator,
    canPost: permissions.canPost,
    canModerate: permissions.canModerate,
    canRead: permissions.canRead,
    membershipStatus: space?.memberPermissions?.status || null,
    isPending: permissions.isPending,
    isBanned: permissions.isBanned,

    // Hierarchy
    breadcrumb,
    parentSpace: space?.parentSpace || null,
    childSpaces: space?.childSpaces || [],

    // Operations
    updateSpace: handleUpdateSpace,
    deleteSpace: handleDeleteSpace,
    joinSpace: handleJoinSpace,
    leaveSpace: handleLeaveSpace,

    // State
    loading,
    error,
  };
}

export default useSpaceData;
