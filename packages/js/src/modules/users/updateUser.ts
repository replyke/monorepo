import { SublayHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";

export interface UpdateUserProps {
  /** The user to update (the target). A user token may only update itself. */
  userId: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  birthdate?: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
}

export async function updateUser(
  client: SublayHttpClient,
  data: UpdateUserProps
): Promise<AuthUser> {
  const { userId, ...body } = data;
  const response = await client.projectInstance.patch<AuthUser>(
    `/users/${userId}`,
    body
  );
  return response.data;
}
