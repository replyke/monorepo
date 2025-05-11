import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { List } from "../../interfaces/models/List";
import useProject from "../projects/useProject";

function useFetchRootList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchRootList = useCallback(async () => {
    if (!projectId) {
      throw new Error("No projectId available.");
    }

    const response = await axios.get<List>(`/${projectId}/lists/root`, {
      withCredentials: true,
    });

    return response.data as List;
  }, [axios, projectId]);

  return fetchRootList;
}

export default useFetchRootList;
