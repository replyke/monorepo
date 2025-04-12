import { ReplykeHttpClient } from "../../core/client";

export interface FetchUserByReferenceIdProps {
  referenceId: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  // birthdate?: string; // ISO format string
  // location?: string;  // "lat,lng" string format (e.g. "32.0853,34.7818")
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
}

export async function fetchUserByReferenceId(
  client: ReplykeHttpClient,
  data: FetchUserByReferenceIdProps
): Promise<any> {
  const path = `/users/by-reference-id`;

  const params: Record<string, any> = {
    referenceId: data.referenceId,
    name: data.name,
    username: data.username,
    avatar: data.avatar,
    bio: data.bio,
    // birthdate: data.birthdate,
    // location: data.location,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    secureMetadata: data.secureMetadata
      ? JSON.stringify(data.secureMetadata)
      : undefined,
  };

  const response = await client.instance.get<any>(path, {
    params,
  });

  return response.data;
}
