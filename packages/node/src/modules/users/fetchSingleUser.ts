import { ReplykeHttpClient } from "../../core/client";

export interface FetchSingleUserProps {
  userId?: string;
  referenceId?: string;
}

// TODO: Replace "any" with Entity once we have types here too
export async function fetchSingleUser(
  client: ReplykeHttpClient,
  data: FetchSingleUserProps
): Promise<any> {
  const path = `/users`; // assuming client handles prefix like /{projectId}
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
