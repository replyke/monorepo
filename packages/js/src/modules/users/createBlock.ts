import { SublayHttpClient } from "../../core/client";

export interface CreateBlockProps {
  /** The user being blocked (the target). The blocker is the token holder. */
  userId: string;
}

export interface BlockResponse {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

/**
 * POST /users/:userId/block — block `:userId`.
 *
 * The blocker is derived from the token (Rule A — no `actingUserId`). Idempotent:
 * re-blocking an already-blocked user succeeds. Self-block is rejected server-side.
 * On a new block the server tears down existing follows/connections both ways.
 */
export async function createBlock(
  client: SublayHttpClient,
  data: CreateBlockProps
): Promise<BlockResponse> {
  const { userId } = data;
  const response = await client.projectInstance.post<BlockResponse>(
    `/users/${userId}/block`,
    {}
  );
  return response.data;
}
