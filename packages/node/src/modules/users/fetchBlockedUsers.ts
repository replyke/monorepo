import { SublayHttpClient } from "../../core/client";
import { BlockedUser } from "../../interfaces/Block";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchBlockedUsersProps {
  /**
   * The user whose own outbound block list is being read (the blocker). The
   * server resolves this via `resolveActingUserId` (service/master keys), so it
   * is sent as the `userId` query param on the `/blocks` route — mirroring the
   * server's act-on-behalf handling for the private block list.
   */
  actingUserId: string;
  page?: number;
  limit?: number;
}

export async function fetchBlockedUsers(
  client: SublayHttpClient,
  data: FetchBlockedUsersProps
): Promise<PaginatedResponse<BlockedUser>> {
  const { actingUserId, ...rest } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<BlockedUser>
  >(`/blocks`, {
    params: { userId: actingUserId, ...rest },
  });
  return response.data;
}
