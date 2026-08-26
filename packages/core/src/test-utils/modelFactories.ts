import type { Comment } from "../interfaces/models/Comment";
import type { Entity } from "../interfaces/models/Entity";
import type { Event } from "../interfaces/models/Event";
import type { Reaction } from "../interfaces/models/Reaction";
import type { Space, SpaceDetailed } from "../interfaces/models/Space";
import type { User } from "../interfaces/models/User";
import type { Conversation, ConversationPreview } from "../interfaces/models/Conversation";
import type { ConversationMember } from "../interfaces/models/ConversationMember";
import type { ChatMessage } from "../interfaces/models/ChatMessage";
import type { ReputationGrant } from "../interfaces/models/ReputationGrant";

export function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conversation-1",
    projectId: "test-project",
    type: "direct",
    name: null,
    description: null,
    spaceId: null,
    createdById: "user-1",
    avatarFileId: null,
    lastMessageAt: null,
    postingPermission: null,
    metadata: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeConversationPreview(
  overrides: Partial<ConversationPreview> = {},
): ConversationPreview {
  return {
    ...makeConversation(),
    unreadCount: 0,
    lastMessage: null,
    otherMembers: [],
    ...overrides,
  };
}

export function makeConversationMember(
  overrides: Partial<ConversationMember> = {},
): ConversationMember {
  return {
    id: "member-1",
    projectId: "test-project",
    conversationId: "conversation-1",
    userId: "user-1",
    role: "member",
    lastReadAt: null,
    mutedUntil: null,
    isActive: true,
    leftAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "message-1",
    projectId: "test-project",
    conversationId: "conversation-1",
    userId: "user-1",
    content: "hello",
    gif: null,
    mentions: [],
    metadata: {},
    parentMessageId: null,
    quotedMessageId: null,
    threadReplyCount: 0,
    reactionCounts: {},
    userReactions: [],
    editedAt: null,
    userDeletedAt: null,
    moderationStatus: null,
    moderatedAt: null,
    moderatedById: null,
    moderatedByType: null,
    moderationReason: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    user: makeUser(),
    ...overrides,
  };
}

export function makeSpaceDetailed(overrides: Partial<SpaceDetailed> = {}): SpaceDetailed {
  return {
    ...makeSpace(),
    memberPermissions: null,
    parentSpace: null,
    childSpaces: [],
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    projectId: "test-project",
    foreignId: null,
    role: "visitor",
    name: "Test User",
    username: "testuser",
    avatar: null,
    avatarFileId: null,
    bannerFileId: null,
    bio: null,
    birthdate: null,
    location: null,
    metadata: {},
    reputation: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: "space-1",
    projectId: "test-project",
    shortId: "space-short-1",
    slug: "space-1",
    name: "Space name",
    description: null,
    avatarFileId: null,
    bannerFileId: null,
    userId: "user-1",
    readingPermission: "anyone",
    postingPermission: "anyone",
    visibility: "public",
    requireJoinApproval: false,
    nsfw: false,
    nsfwEffective: false,
    parentSpaceId: null,
    depth: 0,
    metadata: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    membersCount: 0,
    childSpacesCount: 0,
    ...overrides,
  };
}

export function makeReaction(overrides: Partial<Reaction> = {}): Reaction {
  return {
    id: "reaction-1",
    projectId: "test-project",
    targetType: "entity",
    targetId: "entity-1",
    userId: "user-1",
    reactionType: "upvote",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    projectId: "test-project",
    foreignId: null,
    entityId: "entity-1",
    userId: "user-1",
    parentId: null,
    content: "hello",
    gif: null,
    mentions: [],
    upvotes: [],
    downvotes: [],
    reactionCounts: {
      upvote: 0,
      downvote: 0,
      like: 0,
      love: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      funny: 0,
    },
    userReaction: null,
    repliesCount: 0,
    metadata: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    parentDeletedAt: null,
    userDeletedAt: null,
    moderationStatus: null,
    moderatedAt: null,
    moderatedById: null,
    moderatedByType: null,
    moderationReason: null,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    shortId: "event-short-1",
    projectId: "test-project",
    userId: "user-1",
    title: "Event title",
    description: null,
    startTime: "2024-06-01T00:00:00.000Z",
    endTime: null,
    timezone: null,
    type: "online",
    url: null,
    venueName: null,
    address: null,
    location: null,
    spaceId: null,
    visibility: "public",
    status: "active",
    allowMaybe: true,
    guestListVisible: false,
    capacity: null,
    hostIds: ["user-1"],
    coverImageId: null,
    rsvpCounts: { going: 0, maybe: 0, not_going: 0 },
    metadata: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

export function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "entity-1",
    foreignId: null,
    shortId: "short-1",
    projectId: "test-project",
    sourceId: null,
    spaceId: null,
    userId: "user-1",
    title: "Entity title",
    content: "Entity content",
    mentions: [],
    attachments: [],
    keywords: [],
    upvotes: [],
    downvotes: [],
    reactionCounts: {
      upvote: 0,
      downvote: 0,
      like: 0,
      love: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      funny: 0,
    },
    userReaction: null,
    repliesCount: 0,
    views: 0,
    score: 0,
    scoreUpdatedAt: "2024-01-01T00:00:00.000Z",
    location: null,
    metadata: {},
    nsfw: false,
    nsfwEffective: false,
    topComment: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    isDraft: false,
    moderationStatus: null,
    moderatedAt: null,
    moderatedById: null,
    moderatedByType: null,
    moderationReason: null,
    ...overrides,
  };
}

export function makeReputationGrant(
  overrides: Partial<ReputationGrant> = {},
): ReputationGrant {
  return {
    id: "grant-1",
    sourceType: "user",
    senderId: "user-1",
    recipientId: "user-2",
    amount: 10,
    spaceId: null,
    targetType: null,
    targetId: null,
    note: null,
    metadata: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}
