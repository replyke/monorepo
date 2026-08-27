import { SublayHttpClient } from "../../core/client";
import {
  GrantWriteCommonProps,
  ReputationGrant,
  ReputationGrantTargetFilter,
} from "../../interfaces/ReputationGrant";

interface CreateGrantBaseProps extends GrantWriteCommonProps {
  /**
   * The sender — the user the reputation is debited FROM. Required: a service
   * key has no session user, so the actor must be named explicitly.
   *
   * Spelled `actingUserId` rather than `userId` because this body also names a
   * target user (`recipientId`), and the house rule reserves `userId` for the
   * target on any route that has one.
   */
  actingUserId: string;
  /** The user receiving the reputation. Must differ from `actingUserId`. */
  recipientId: string;
  /**
   * Positive integer. A transfer can never mint (negatives) nor be a no-op
   * (zero) — use {@link mintGrant} to create or destroy reputation.
   */
  amount: number;
}

/**
 * `targetType` and `targetId` are supplied together or not at all — the
 * both-or-neither pair is carried by {@link ReputationGrantTargetFilter}, which
 * makes the half-filled shape a compile error instead of a
 * `400 reputation-grant/invalid-body`.
 */
export type CreateGrantProps = CreateGrantBaseProps &
  ReputationGrantTargetFilter;

/**
 * Transfers reputation from one user to another — a **debited transfer**: the
 * amount leaves the sender's bucket and lands in the recipient's bucket in the
 * same space. Nothing is created.
 *
 * A service key is the "mediated" caller here: the project setting that can
 * disable user-initiated grants, and block edges between the two parties, are
 * both skipped.
 */
export async function createGrant(
  client: SublayHttpClient,
  data: CreateGrantProps
): Promise<ReputationGrant> {
  const response = await client.projectInstance.post<ReputationGrant>(
    "/reputation-grants",
    data
  );
  return response.data;
}
