import { SublayHttpClient } from "../../core/client";
import { BlockStatusResponse } from "../../interfaces/Block";

export interface FetchBlockStatusProps {
  /** The user whose block relationship is being checked (the target). */
  userId: string;
  /** The user whose perspective the status is from (the blocker). */
  actingUserId: string;
}

export async function fetchBlockStatus(
  client: SublayHttpClient,
  data: FetchBlockStatusProps
): Promise<BlockStatusResponse> {
  const { userId, actingUserId } = data;
  const response = await client.projectInstance.get<BlockStatusResponse>(
    `/users/${userId}/block`,
    { params: { actingUserId } }
  );
  return response.data;
}
