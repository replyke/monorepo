import { useMemo } from "react";
import {
  SpaceMemberPermissions,
  PostingPermission,
  ReadingPermission,
} from "../../interfaces/models/Space";

export interface UseSpacePermissionsProps {
  memberPermissions: SpaceMemberPermissions | null | undefined;
  postingPermission: PostingPermission;
  readingPermission?: ReadingPermission;
}

export interface UseSpacePermissionsValues {
  isMember: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canPost: boolean;
  canModerate: boolean;
  canRead: boolean;
  isPending: boolean;
  isBanned: boolean;
}

function useSpacePermissions({
  memberPermissions,
  postingPermission,
  readingPermission = "anyone",
}: UseSpacePermissionsProps): UseSpacePermissionsValues {
  return useMemo(() => {
    if (!memberPermissions) {
      // User is not a member
      return {
        isMember: false,
        isAdmin: false,
        isModerator: false,
        canPost: postingPermission === "anyone",
        canModerate: false,
        canRead: readingPermission === "anyone",
        isPending: false,
        isBanned: false,
      };
    }

    const isAdmin = memberPermissions.isAdmin;
    const isModerator = memberPermissions.isModerator;
    const isActiveMember = memberPermissions.status === "active";
    const isPending = memberPermissions.status === "pending";
    const isBanned = memberPermissions.status === "banned";

    let canPost = false;
    if (postingPermission === "anyone") {
      canPost = !isBanned;
    } else if (postingPermission === "members") {
      canPost = isActiveMember && !isBanned;
    } else if (postingPermission === "admins") {
      canPost = isAdmin && isActiveMember && !isBanned;
    }

    // canRead logic: if readingPermission is "members", only active members can read
    let canRead = true;
    if (readingPermission === "members") {
      canRead = isActiveMember && !isBanned;
    }

    return {
      isMember: memberPermissions.isMember,
      isAdmin,
      isModerator,
      canPost,
      canModerate: (isAdmin || isModerator) && isActiveMember && !isBanned,
      canRead,
      isPending,
      isBanned,
    };
  }, [memberPermissions, postingPermission, readingPermission]);
}

export default useSpacePermissions;
