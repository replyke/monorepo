import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface FetchUserByForeignIdProps extends SpaceReputationUserParams {
  foreignId: string;
  createIfNotFound?: boolean;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
  include?: string;
}

export async function fetchUserByForeignId(
  client: SublayHttpClient,
  data: FetchUserByForeignIdProps
): Promise<User> {
  const path = `/users/by-foreign-id`;

  const params: Record<string, any> = {
    foreignId: data.foreignId,
    createIfNotFound: data.createIfNotFound,
    name: data.name,
    username: data.username,
    avatar: data.avatar,
    bio: data.bio,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    secureMetadata: data.secureMetadata
      ? JSON.stringify(data.secureMetadata)
      : undefined,
    include: data.include,
    ...buildSpaceReputationParams({
      spaceReputation: data.spaceReputation,
      spaceReputationId: data.spaceReputationId,
      spaceReputationDescendants: data.spaceReputationDescendants,
    }),
  };

  const response = await client.projectInstance.get<User>(path, {
    params,
  });

  return response.data;
}
