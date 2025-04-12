import { ReplykeHttpClient } from "../../core/client";

export interface FetchUserByIdProps {
  userId: string;
}

// TODO: Replace "any" with Entity once we have types here too
export async function fetchUserById(
  client: ReplykeHttpClient,
  data: FetchUserByIdProps
): Promise<any> {
  const path = `/users/${data.userId}`; // assuming client handles prefix like /{projectId}
  const response = await client.instance.get<any>(path);
  return response.data;
}
