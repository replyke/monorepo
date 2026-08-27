import { SublayHttpClient } from "../../core/client";

export interface FetchBlockStatusProps {
  /**
   * The user whose block status is being checked (the target). The status is the
   * token holder's OUTBOUND state only: do *I* block `:userId`?
   */
  userId: string;
}

/**
 * The block-status response is outbound-only by design: it reports whether the
 * token holder blocks the target, and NEVER whether the target blocked the
 * caller (the inbound direction is deliberately not disclosed).
 */
export interface BlockStatusResponse {
  blocked: boolean;
  blockId?: string;
  createdAt?: string;
}

/**
 * GET /users/:userId/block — the token holder's outbound block status toward
 * `:userId` (Rule A — no `actingUserId`).
 */
export async function fetchBlockStatus(
  client: SublayHttpClient,
  data: FetchBlockStatusProps
): Promise<BlockStatusResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<BlockStatusResponse>(
    `/users/${userId}/block`
  );
  return response.data;
}
