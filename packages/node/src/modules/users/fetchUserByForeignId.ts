import { ReplykeHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface FetchUserByForeignIdProps {
  foreignId: string;
  createIfNotFound?: boolean;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
}

export async function fetchUserByForeignId(
  client: ReplykeHttpClient,
  data: FetchUserByForeignIdProps
): Promise<User> {
  const path = `/users/by-foreign-id`;

  const params: Record<string, any> = {
    foreignId: data.foreignId,
    createIfNotFound: data.foreignId,
    name: data.name,
    username: data.username,
    avatar: data.avatar,
    bio: data.bio,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    secureMetadata: data.secureMetadata
      ? JSON.stringify(data.secureMetadata)
      : undefined,
  };

  const response = await client.projectInstance.get<User>(path, {
    params,
  });

  return response.data;
}
