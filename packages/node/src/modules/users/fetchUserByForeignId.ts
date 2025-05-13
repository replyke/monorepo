import { ReplykeHttpClient } from "../../core/client";

export interface FetchUserByForeignIdProps {
  foreignId: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  // birthdate?: string; // ISO format string
  // location?: string;  // "lat,lng" string format (e.g. "32.0853,34.7818")
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
}

export async function fetchUserByForeignId(
  client: ReplykeHttpClient,
  data: FetchUserByForeignIdProps
): Promise<any> {
  const path = `/users/by-foreign-id`;

  const params: Record<string, any> = {
    foreignId: data.foreignId,
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

  const response = await client.projectInstance.get<any>(path, {
    params,
  });

  return response.data;
}
