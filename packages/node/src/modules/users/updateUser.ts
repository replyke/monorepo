import { SublayHttpClient } from "../../core/client";
import { UserFull } from "../../interfaces/User";

export interface UpdateUserProps {
  userId: string;
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  metadata?: Record<string, any>;
  birthdate?: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export async function updateUser(
  client: SublayHttpClient,
  data: UpdateUserProps
): Promise<UserFull> {
  const { userId, ...body } = data;
  const response = await client.projectInstance.patch<UserFull>(
    `/users/${userId}`,
    body
  );
  return response.data;
}
