import { SublayHttpClient } from "../../core/client";
import { File as SublayFile } from "../../interfaces/File";

export interface GetFileProps {
  fileId: string;
}

export async function getFile(
  client: SublayHttpClient,
  data: GetFileProps
): Promise<SublayFile> {
  const { fileId } = data;
  const response = await client.projectInstance.get<SublayFile>(
    `/storage/${fileId}`
  );
  return response.data;
}
