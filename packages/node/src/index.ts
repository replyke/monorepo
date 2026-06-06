import { SublayHttpClient, ClientConfig } from "./core/client";
import * as AppNotifications from "./modules/app-notifications";
import * as Auth from "./modules/auth";
import * as Collections from "./modules/collections";
import * as Comments from "./modules/comments";
import * as Entities from "./modules/entities";
import * as HostedApps from "./modules/hosted-apps";
import * as Reports from "./modules/reports";
import * as Search from "./modules/search";
import * as Spaces from "./modules/spaces";
import * as Users from "./modules/users";

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
  public collections: BoundModule<typeof Collections>;
  public comments: BoundModule<typeof Comments>;
  public entities: BoundModule<typeof Entities>;
  public hostedApps: BoundModule<typeof HostedApps>;
  public reports: BoundModule<typeof Reports>;
  public search: BoundModule<typeof Search>;
  public spaces: BoundModule<typeof Spaces>;
  public users: BoundModule<typeof Users>;

  private constructor(http: SublayHttpClient) {
    this.http = http;
    this.appNotifications = bindModule(AppNotifications, this.http);
    this.auth = bindModule(Auth, this.http);
    this.collections = bindModule(Collections, this.http);
    this.comments = bindModule(Comments, this.http);
    this.entities = bindModule(Entities, this.http);
    this.hostedApps = bindModule(HostedApps, this.http);
    this.reports = bindModule(Reports, this.http);
    this.search = bindModule(Search, this.http);
    this.spaces = bindModule(Spaces, this.http);
    this.users = bindModule(Users, this.http);
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

// Export commonly used interfaces
export type { Entity, TopComment } from "./interfaces/Entity";
export type { Comment, GifData } from "./interfaces/Comment";
export type { User, UserFull, AuthUser, UserRole } from "./interfaces/User";
export type { Collection } from "./interfaces/Collection";
export type { Space, SpaceDetailed, SpacePreview, DigestConfig, SpaceBreadcrumb } from "./interfaces/Space";
export type { SpaceMember, SpaceMemberWithUser } from "./interfaces/SpaceMember";
export type { Rule } from "./interfaces/Rule";
export type { Follow } from "./interfaces/Follow";
export type { Connection, EstablishedConnection, PendingConnection, ConnectionStatusResponse } from "./interfaces/Connection";
export type { Conversation, ConversationPreview } from "./interfaces/Conversation";
export type { ConversationMember, ConversationMemberRole } from "./interfaces/ConversationMember";
export type { ChatMessage } from "./interfaces/ChatMessage";
export type { Reaction, ReactionType, ReactionCounts } from "./interfaces/Reaction";
export type { UnifiedAppNotification, PotentiallyPopulatedUnifiedAppNotification } from "./interfaces/AppNotification";
export type { OAuthIdentity } from "./interfaces/OAuthIdentity";
export type { Report, CreateReportResponse } from "./interfaces/Report";
export type { File, FileImage } from "./interfaces/File";
