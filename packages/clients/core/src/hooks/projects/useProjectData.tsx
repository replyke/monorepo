import { useEffect, useState } from "react";
import { Project } from "../../interfaces/models/Project";
import { handleError } from "../../utils/handleError";
import axios from "../../config/axios";

export interface UseProjectDataProps {
  projectId: string | null | undefined;
}
export interface UseProjectDataValues {
  projectId: string;
  project: Pick<Project, "id" | "integrations"> | null;
}

function useProjectData({
  projectId,
}: UseProjectDataProps): UseProjectDataValues {
  const [project, setProject] = useState<Project | null>(null);

  if (!projectId) throw new Error("Please pass a project ID");

  useEffect(() => {
    const handleFetchProject = async () => {
      try {
        const response = await axios.get(
          `https://api.replyke.com/internal/projects/${projectId}/lean`
        );

        const fetchedProject = response.data as Project;
        setProject(fetchedProject);
      } catch (err) {
        handleError(err, "Failed to fetch project");
      }
    };

    if (projectId) handleFetchProject();
  }, [projectId]);

  return { projectId, project };
}

export default useProjectData;
