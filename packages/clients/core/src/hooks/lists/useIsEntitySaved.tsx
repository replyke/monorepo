import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { useCallback, useRef, useState } from "react";
import useUser from "../users/useUser";

function useIsEntitySaved() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const [entityIsSaved, setEntityIsSaved] = useState<boolean | null>(null);
  const checkedStatus = useRef<Record<string, boolean>>({}); // Track status by entityId

  const checkIfEntityIsSaved = useCallback(
    async (entityId: string) => {
      if (!user || !entityId || checkedStatus.current[entityId]) return;

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      checkedStatus.current[entityId] = true; // Mark this entityId as checked
      const response = await axios.get<boolean>(
        `/${projectId}/lists/is-entity-saved`,
        {
          params: { entityId },
          withCredentials: true,
        }
      );

      setEntityIsSaved(response.data);
    },
    [user, axios, projectId]
  );

  return { checkIfEntityIsSaved, entityIsSaved };
}

export default useIsEntitySaved;
