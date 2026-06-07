import { File } from "./File";
import { ChatMessage } from "./ChatMessage";
import { ConversationMember } from "./ConversationMember";

export interface Conversation {
  id: string;
  projectId: string;
  type: "direct" | "group" | "space";
  name: string | null;
  description: string | null;
  spaceId: string | null;
  createdById: string | null;
  avatarFileId: string | null;
  lastMessageAt: Date | null;
  // Null for DMs and groups; 'members' | 'admins' for space chats
  postingPermission: "members" | "admins" | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  memberCount?: number;
  currentMember?: ConversationMember; // The requesting user's own member row
  avatarFile?: File;
}

export interface ConversationPreview extends Conversation {
  unreadCount: number;
  lastMessage: ChatMessage | null; // Truncated to 100 chars by the server
}
