import { ReplykeHttpClient } from "../../core/client";

export interface FetchUserByReferenceIdProps {
  referenceId: string;
}

// TODO: Replace "any" with Entity once we have types here too
export async function fetchUserByReferenceId(
  client: ReplykeHttpClient,
  data: FetchUserByReferenceIdProps
): Promise<any> {
  const path = `/users/by-reference-id`; // assuming client handles prefix like /{projectId}
  const response = await client.instance.get<any>(path, {
    params: { referenceId: data.referenceId },
  });
  return response.data;
}
