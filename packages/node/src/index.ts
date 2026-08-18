import { SublayHttpClient, ClientConfig } from "./core/client";
import * as AppNotifications from "./modules/app-notifications";
import * as Auth from "./modules/auth";
import * as Chat from "./modules/chat";
import * as Collections from "./modules/collections";
import * as Comments from "./modules/comments";
import * as Connections from "./modules/connections";
import * as Entities from "./modules/entities";
import * as Events from "./modules/events";
import * as Follows from "./modules/follows";
import * as HostedApps from "./modules/hosted-apps";
import * as Push from "./modules/push";
import * as Reports from "./modules/reports";
import * as Search from "./modules/search";
import * as Spaces from "./modules/spaces";
import * as Storage from "./modules/storage";
import * as TablesManagement from "./modules/tables-management";
import * as Users from "./modules/users";
import * as Workspaces from "./modules/workspaces";
import { createTableAccessor } from "./modules/tables";
import { TableAccessor, TableRow } from "./interfaces/Table";

type BoundModule<
  T extends Record<string, (client: SublayHttpClient, ...args: any[]) => any>
> = {
  [K in keyof T]: (
    ...args: Parameters<T[K]> extends [any, ...infer R] ? R : never
  ) => ReturnType<T[K]>;
};

export class SublayClient {
  private http: SublayHttpClient;

  public appNotifications: BoundModule<typeof AppNotifications>;
  public auth: BoundModule<typeof Auth>;
  public chat: BoundModule<typeof Chat>;
  public collections: BoundModule<typeof Collections>;
  public comments: BoundModule<typeof Comments>;
  public connections: BoundModule<typeof Connections>;
  public entities: BoundModule<typeof Entities>;
  public events: BoundModule<typeof Events>;
  public follows: BoundModule<typeof Follows>;
  public hostedApps: BoundModule<typeof HostedApps>;
  public push: BoundModule<typeof Push>;
  public reports: BoundModule<typeof Reports>;
  public search: BoundModule<typeof Search>;
  public spaces: BoundModule<typeof Spaces>;
  public storage: BoundModule<typeof Storage>;
  public users: BoundModule<typeof Users>;
  public workspaces: BoundModule<typeof Workspaces>;
  /** Table-management (DDL) — service-key only. */
  public tables: BoundModule<typeof TablesManagement>;

  private constructor(http: SublayHttpClient) {
    this.http = http;
    this.appNotifications = bindModule(AppNotifications, this.http);
    this.auth = bindModule(Auth, this.http);
    this.chat = bindModule(Chat, this.http);
    this.collections = bindModule(Collections, this.http);
    this.comments = bindModule(Comments, this.http);
    this.connections = bindModule(Connections, this.http);
    this.entities = bindModule(Entities, this.http);
    this.events = bindModule(Events, this.http);
    this.follows = bindModule(Follows, this.http);
    this.hostedApps = bindModule(HostedApps, this.http);
    this.push = bindModule(Push, this.http);
    this.reports = bindModule(Reports, this.http);
    this.search = bindModule(Search, this.http);
    this.spaces = bindModule(Spaces, this.http);
    this.storage = bindModule(Storage, this.http);
    this.users = bindModule(Users, this.http);
    this.workspaces = bindModule(Workspaces, this.http);
    this.tables = bindModule(TablesManagement, this.http);
  }

  /**
   * Callable row-operations accessor for a custom table:
   * `client.table<EventRow>("Events").find(...)`. A net-new pattern — the flat
   * `bindModule` namespace can't capture a per-call table name.
   */
  table<T = TableRow>(name: string): TableAccessor<T> {
    return createTableAccessor<T>(this.http, name);
  }

  static async init(config: ClientConfig): Promise<SublayClient> {
    const http = new SublayHttpClient(config);
    await verifyClient(http);
    return new SublayClient(http);
  }
}

function bindModule<
  T extends Record<string, (client: SublayHttpClient, ...args: any[]) => any>
>(module: T, client: SublayHttpClient): BoundModule<T> {
  const bound: any = {};
  for (const key in module) {
    bound[key] = (...args: any[]) => module[key](client, ...args);
  }
  return bound;
}

async function verifyClient(client: SublayHttpClient): Promise<void> {
  try {
    await client.internalInstance.get("/service/verify");
  } catch (err: any) {
    throw new Error("[Sublay] Invalid API key or project ID.");
  }
}

// Export pagination types
export type { PaginatedResponse, PaginationMetadata } from "./interfaces/IPaginatedResponse";

// Export custom-table types
export type {
  TableAccessor,
  TableRow,
  TableQuery,
  DbFilter,
  DbFilterOperator,
  CustomColumnType,
  CustomColumnDefinition,
  CreateTableProps,
  BulkDeleteProps,
  DeleteResult,
  BulkDeleteResult,
} from "./interfaces/Table";
export type { AddColumnProps } from "./modules/tables-management/addColumn";

// Export commonly used interfaces
export type { Entity, TopComment } from "./interfaces/Entity";
export type {
  Event,
  EventRsvp,
  EventInvite,
  EventType,
  EventVisibility,
  EventStatus,
  RsvpStatus,
  RsvpCounts,
} from "./interfaces/Event";
export type { Comment, GifData } from "./interfaces/Comment";
export type { User, UserFull, AuthUser, UserRole } from "./interfaces/User";
export type {
  SpaceReputationContextParams,
  SpaceReputationUserParams,
} from "./interfaces/SpaceReputation";
export type { UserSearchParams } from "./interfaces/UserSearch";
export type { Collection } from "./interfaces/Collection";
export type { Space, SpaceDetailed, SpacePreview, SpaceBreadcrumb } from "./interfaces/Space";
export type { SpaceMember, SpaceMemberWithUser } from "./interfaces/SpaceMember";
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceCapability,
  WorkspaceInvitationStatus,
  WorkspaceAuthorityReason,
  WorkspaceAuthorityReasonDetail,
  WorkspaceRosterReason,
  WorkspaceRosterEntry,
  WorkspaceRosterResponse,
  WorkspaceRosterCountsResponse,
  WorkspaceStandingUser,
  WorkspaceMemberStanding,
  WorkspaceAuthority,
  RemoveWorkspaceMemberFromSubtreeResponse,
  SkippedWorkspace,
} from "./interfaces/Workspace";
export type { Rule } from "./interfaces/Rule";
export type { Follow } from "./interfaces/Follow";
export type { Connection, ConnectionRequestResponse, EstablishedConnection, PendingConnection, ConnectionStatusResponse } from "./interfaces/Connection";
export type { Conversation, ConversationPreview } from "./interfaces/Conversation";
export type { ConversationMember, ConversationMemberRole } from "./interfaces/ConversationMember";
export type { ChatMessage } from "./interfaces/ChatMessage";
export type { Reaction, ReactionType, ReactionCounts } from "./interfaces/Reaction";
export type { UnifiedAppNotification, PotentiallyPopulatedUnifiedAppNotification } from "./interfaces/AppNotification";
export type { OAuthIdentity } from "./interfaces/OAuthIdentity";
export type { PushDeviceResult, SendPushResult } from "./interfaces/Push";
export { PUSH_EVENT_TYPES, MUTE_DURATIONS } from "./interfaces/Push";
export type {
  PushEventType,
  MuteDuration,
  NotificationPreferences,
} from "./interfaces/Push";
export type { UpdateNotificationPreferencesProps } from "./modules/push/updateNotificationPreferences";
export type {
  MuteConversationProps,
  MuteConversationResult,
} from "./modules/chat/muteConversation";
export type { Report, CreateReportResponse } from "./interfaces/Report";
export type { File, FileImage, FileImageVariant } from "./interfaces/File";
export type {
  ImageOptions,
  ImageFit,
  ImageFormat,
  ExactDimensionsOptions,
  AspectRatioWidthOptions,
  AspectRatioHeightOptions,
  OriginalAspectOptions,
  MultiAspectRatioOptions,
} from "./interfaces/ImageProcessing";
