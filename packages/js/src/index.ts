import {
  SublayHttpClient,
  ClientConfig,
  AuthTokens,
} from "./core/client";
import * as Auth from "./modules/auth";
import * as Users from "./modules/users";
import * as Entities from "./modules/entities";
import * as Events from "./modules/events";
import * as Comments from "./modules/comments";
import * as Spaces from "./modules/spaces";
import * as Collections from "./modules/collections";
import * as Follows from "./modules/follows";
import * as Connections from "./modules/connections";
import * as AppNotifications from "./modules/app-notifications";
import * as Reports from "./modules/reports";
import * as Reputation from "./modules/reputation";
import * as Search from "./modules/search";
import * as Storage from "./modules/storage";
import * as OAuth from "./modules/oauth";
import * as Chat from "./modules/chat";
import * as Push from "./modules/push";
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

  public auth: BoundModule<typeof Auth>;
  public users: BoundModule<typeof Users>;
  public entities: BoundModule<typeof Entities>;
  public events: BoundModule<typeof Events>;
  public comments: BoundModule<typeof Comments>;
  public spaces: BoundModule<typeof Spaces>;
  public collections: BoundModule<typeof Collections>;
  public follows: BoundModule<typeof Follows>;
  public connections: BoundModule<typeof Connections>;
  public appNotifications: BoundModule<typeof AppNotifications>;
  public reports: BoundModule<typeof Reports>;
  public reputation: BoundModule<typeof Reputation>;
  public search: BoundModule<typeof Search>;
  public storage: BoundModule<typeof Storage>;
  public oauth: BoundModule<typeof OAuth>;
  public chat: BoundModule<typeof Chat>;
  public push: BoundModule<typeof Push>;
  public workspaces: BoundModule<typeof Workspaces>;

  private constructor(http: SublayHttpClient) {
    this.http = http;
    this.auth = bindModule(Auth, this.http);
    this.users = bindModule(Users, this.http);
    this.entities = bindModule(Entities, this.http);
    this.events = bindModule(Events, this.http);
    this.comments = bindModule(Comments, this.http);
    this.spaces = bindModule(Spaces, this.http);
    this.collections = bindModule(Collections, this.http);
    this.follows = bindModule(Follows, this.http);
    this.connections = bindModule(Connections, this.http);
    this.appNotifications = bindModule(AppNotifications, this.http);
    this.reports = bindModule(Reports, this.http);
    this.reputation = bindModule(Reputation, this.http);
    this.search = bindModule(Search, this.http);
    this.storage = bindModule(Storage, this.http);
    this.oauth = bindModule(OAuth, this.http);
    this.chat = bindModule(Chat, this.http);
    this.push = bindModule(Push, this.http);
    this.workspaces = bindModule(Workspaces, this.http);
  }

  static async init(config: ClientConfig): Promise<SublayClient> {
    const http = new SublayHttpClient(config);
    return new SublayClient(http);
  }

  /**
   * Callable row-operations accessor for a custom table:
   * `client.table<EventRow>("Events").find(...)`. Row ops only — the js-sdk
   * holds no service key, so there is no table-management/DDL surface.
   */
  table<T = TableRow>(name: string): TableAccessor<T> {
    return createTableAccessor<T>(this.http, name);
  }

  /** Imperatively set the session tokens (SDK-managed mode). */
  setTokens(tokens: AuthTokens): void {
    this.http.setTokens(tokens);
  }

  /** Imperatively clear the session tokens, e.g. on logout (SDK-managed mode). */
  clearTokens(): void {
    this.http.clearTokens();
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

export type { ClientConfig, AuthTokens } from "./core/client";
export type {
  PaginatedResponse,
  PaginationMetadata,
} from "./interfaces/IPaginatedResponse";
export type {
  SpaceReputationContextParams,
  SpaceReputationUserParams,
} from "./interfaces/SpaceReputation";
export type { UserSearchParams } from "./interfaces/UserSearch";
export type {
  ReputationGrant,
  ReputationGrantSourceType,
  ReputationGrantTargetType,
  ReputationGrantTargetFilter,
  GrantSummary,
} from "./interfaces/ReputationGrant";
export type { CreateGrantProps } from "./modules/reputation/createGrant";
export type {
  ListGrantsProps,
  ListGrantsResponse,
} from "./modules/reputation/listGrants";
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  MyWorkspaceInvitation,
  WorkspaceInvitationInviter,
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
export { PUSH_EVENT_TYPES, MUTE_DURATIONS } from "./interfaces/Push";
export type {
  PushEventType,
  MuteDuration,
  NotificationPreferences,
  PushDeviceIdentifier,
  WebPushSubscription,
} from "./interfaces/Push";
export type {
  SignOutResult,
  PushUnbindSkipReason,
} from "./modules/auth/signOut";
export type { UpdateNotificationPreferencesProps } from "./modules/push/updateNotificationPreferences";
export type {
  MuteConversationProps,
  MuteConversationResponse,
} from "./modules/chat/muteConversation";
export type {
  TableAccessor,
  TableRow,
  TableQuery,
  DbFilter,
  DbFilterOperator,
  BulkDeleteProps,
  DeleteResult,
  BulkDeleteResult,
} from "./interfaces/Table";
