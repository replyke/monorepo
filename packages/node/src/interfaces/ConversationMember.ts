import { User } from "./User";

export type ConversationMemberRole = "admin" | "member";

export interface ConversationMember {
  id: string;
  projectId: string;
  conversationId: string;
  userId: string;
  role: ConversationMemberRole | null;
  lastReadAt: Date | null;
  mutedUntil: Date | null;
  isActive: boolean;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}
