import { SublayHttpClient } from "../../core/client";
import { File } from "../../interfaces/File";

export interface GetFileProps {
  fileId: string;
}

export async function getFile(
  client: SublayHttpClient,
  data: GetFileProps
): Promise<File> {
  const { fileId } = data;
  const response = await client.projectInstance.get<File>(
    `/storage/${fileId}`
  );
  return response.data;
}
