import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchBlockedUsersProps {
  page?: number;
  limit?: number;
}

/** An entry in the token holder's own block list (their outbound blocks). */
export interface BlockedUserListItem {
  id: string;
  blockedUser: User | null;
  createdAt: string;
}

/**
 * GET /blocks — the token holder's own block list (their outbound blocks),
 * paginated. This is the private "manage / way back to unblock" surface (Rule A
 * — the subject is derived from the token, no `actingUserId`).
 */
export async function fetchBlockedUsers(
  client: SublayHttpClient,
  data: FetchBlockedUsersProps = {}
): Promise<PaginatedResponse<BlockedUserListItem>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<BlockedUserListItem>
  >("/blocks", { params: data });
  return response.data;
}
