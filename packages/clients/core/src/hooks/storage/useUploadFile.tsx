import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

// Type guard to detect if it’s a real browser File
function isBrowserFile(file: UniversalFile): file is BrowserFile {
  return typeof File !== "undefined" && file instanceof File;
}

// 1) Update the hook to accept a “universal” file type:
type BrowserFile = File; // real File from the browser
type RNFile = { uri: string; name: string; type?: string };

type UniversalFile = BrowserFile | RNFile;
type UploadResponse = {
  fileId: string;
  relativePath: string;
  publicPath: string;
};
function useUploadFile() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const uploadFile = useCallback(
    async (
      file: UniversalFile,
      pathParts: string[]
    ): Promise<UploadResponse | void> => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!file || !pathParts || !Array.isArray(pathParts)) {
        throw new Error("Invalid arguments. File and pathParts are required.");
      }

      const formData = new FormData();

      // 2) Check if it's a browser File or a React Native { uri, ... } object
      if (isBrowserFile(file)) {
        // We are dealing with a real browser File
        formData.append("file", file, file.name);
      } else {
        // We assume it’s a React Native { uri, type, name } shape
        formData.append("file", {
          uri: file.uri,
          type: file.type || "application/octet-stream",
          name: file.name,
        } as any); // casting to `any` to appease TS if needed
      }

      // 3) Append other form fields
      formData.append("pathParts", JSON.stringify(pathParts));

      // 4) Make the request
      const response = await axios.post(`/${projectId}/storage`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      return response.data as UploadResponse; // Return the server response
    },
    [projectId, axios]
  );

  return uploadFile;
}

export default useUploadFile;
