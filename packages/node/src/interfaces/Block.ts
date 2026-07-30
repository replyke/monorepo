import { User } from "./User";

/** A directed block edge: `blockerId` has blocked `blockedId`. */
export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

/** Outbound-only block status: does the acting user block the target? */
export interface BlockStatusResponse {
  blocked: boolean;
  blockId?: string;
  createdAt?: string;
}

/** A row in the acting user's own block list, carrying the blocked user's summary. */
export interface BlockedUser {
  id: string;
  blockedUser: User | null;
  createdAt: string;
}
