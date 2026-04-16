import { ReplykeHttpClient } from "../../core/client";
import { Connection } from "../../interfaces/Connection";

export interface RequestConnectionProps {
  userId: string;
  message?: string;
}

export async function requestConnection(
  client: ReplykeHttpClient,
  data: RequestConnectionProps
): Promise<Connection> {
  const { userId, ...body } = data;
  const response = await client.projectInstance.post<Connection>(
    `/users/${userId}/connection`,
    body
  );
  return response.data;
}
