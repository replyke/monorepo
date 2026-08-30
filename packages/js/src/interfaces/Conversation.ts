import { File } from "./File";
import { ChatMessage } from "./ChatMessage";
import { ConversationMember } from "./ConversationMember";
import { User } from "./User";

export interface Conversation {
  id: string;
  projectId: string;
  type: "direct" | "group" | "space";
  name: string | null;
  description: string | null;
  spaceId: string | null;
  createdById: string | null;
  avatarFileId: string | null;
  lastMessageAt: string | null;
  // Null for DMs and groups; 'members' | 'admins' for space chats
  postingPermission: "members" | "admins" | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  memberCount?: number;
  currentMember?: ConversationMember; // The requesting user's own member row
  avatarFile?: File;
}

export interface ConversationPreview extends Conversation {
  unreadCount: number;
  lastMessage: ChatMessage | null; // Truncated to 100 chars by the server
  // Up to 5 active members other than the requester, with public user fields
  // (id, name, username, avatar). Populated for `direct`/`group` conversations
  // (a DM/group has no `name`, so the counterparty supplies the title/avatar);
  // capped at 5 (use `memberCount` for the group total), empty for `space`.
  otherMembers?: Pick<User, "id" | "name" | "username" | "avatar">[];
}
