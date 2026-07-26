import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface SetSpaceEntityNsfwProps {
  spaceId: string;
  entityId: string;
  nsfw: boolean;
}

interface SetSpaceEntityNsfwResponse {
  message: string;
  nsfw: boolean;
}

/**
 * Hook to set the NSFW flag on an entity within a space.
 * Requires space moderator permissions.
 *
 * @example
 * const setSpaceEntityNsfw = useSetSpaceEntityNsfw();
 *
 * await setSpaceEntityNsfw({
 *   spaceId: "space-uuid",
 *   entityId: "entity-uuid",
 *   nsfw: true,
 * });
 */
function useSetSpaceEntityNsfw(): (
  props: SetSpaceEntityNsfwProps
) => Promise<SetSpaceEntityNsfwResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const setSpaceEntityNsfw = useCallback(
    async ({ spaceId, entityId, nsfw }: SetSpaceEntityNsfwProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!spaceId || !entityId) {
        throw new Error("spaceId and entityId are required.");
      }

      const response = await axios.patch(
        `/${projectId}/spaces/${spaceId}/entities/${entityId}/nsfw`,
        { nsfw }
      );

      return response.data as SetSpaceEntityNsfwResponse;
    },
    [projectId, axios]
  );

  return setSpaceEntityNsfw;
}

export default useSetSpaceEntityNsfw;
