import { ReplykeHttpClient } from "../../core/client";

export interface DeleteFileProps {
  fileId: string;
}

export async function deleteFile(
  client: ReplykeHttpClient,
  data: DeleteFileProps
): Promise<void> {
  const { fileId } = data;
  await client.projectInstance.delete(`/storage/${fileId}`);
}
