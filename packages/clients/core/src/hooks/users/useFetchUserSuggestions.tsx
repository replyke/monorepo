import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { User } from "../../interfaces/models/User";

function useFetchUserSuggestions() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchUserSuggestions = useCallback(
    async ({ query }: { query: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.get(`/${projectId}/users/suggestions`, {
        params: {
          query,
        },
      });

      return response.data as User[];
    },
    [axios, projectId]
  );

  return fetchUserSuggestions;
}

export default useFetchUserSuggestions;
