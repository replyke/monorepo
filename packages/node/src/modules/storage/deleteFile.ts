import { SublayHttpClient } from "../../core/client";

export interface DeleteFileProps {
  fileId: string;
}

export async function deleteFile(
  client: SublayHttpClient,
  data: DeleteFileProps
): Promise<void> {
  const { fileId } = data;
  await client.projectInstance.delete(`/storage/${fileId}`);
}
