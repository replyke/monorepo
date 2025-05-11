import { useCallback } from "react";
import axios from "../../config/axios";
import useProject from "../projects/useProject";
import { isAbsoluteUrl } from "../../utils/isAbsoluteUrl";

function useGetMetadata() {
  const { projectId } = useProject();

  const getMetadata = useCallback(
    async ({ url }: { url: string }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!url) {
        throw new Error("Please specify a URL");
      }

      const isAbsolute = isAbsoluteUrl(url);

      if (!isAbsolute) {
        throw new Error("Please provide an absolute URL");
      }

      const response = await axios.get(`/${projectId}/utils/get-metadata`, {
        params: {
          url,
        },
      });

      return response.data;
    },
    [projectId]
  );

  return getMetadata;
}

export default useGetMetadata;
