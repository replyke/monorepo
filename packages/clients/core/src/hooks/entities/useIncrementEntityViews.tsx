import { useCallback, useRef } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";

export interface IncrementEntityViewsProps {
  entityId: string;
}

function useIncrementEntityViews() {
  const { projectId } = useProject();

  const incrementedEntityViewsStatus = useRef<Record<string, boolean>>({}); // Track status by unique key

  const incrementEntityViews = useCallback(
    async ({ entityId }: IncrementEntityViewsProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!entityId) {
        throw new Error("No entityId provided.");
      }

      if (incrementedEntityViewsStatus.current[entityId]) return;

      incrementedEntityViewsStatus.current[entityId] = true;

      await axios.patch(`/${projectId}/entities/${entityId}/increment-views`);
    },
    [projectId]
  );

  return incrementEntityViews;
}

export default useIncrementEntityViews;
