import { ReplykeHttpClient, ClientConfig } from "./core/client";
import * as Entities from "./modules/entities";

type BoundModule<
  T extends Record<string, (client: ReplykeHttpClient, ...args: any[]) => any>
> = {
  [K in keyof T]: (
    ...args: Parameters<T[K]> extends [any, ...infer R] ? R : never
  ) => ReturnType<T[K]>;
};

export class ReplykeClient {
  private http: ReplykeHttpClient;

  public entities: BoundModule<typeof Entities>;

  private constructor(http: ReplykeHttpClient) {
    this.http = http;
    this.entities = bindModule(Entities, this.http);
  }

  static async init(config: ClientConfig): Promise<ReplykeClient> {
    const http = new ReplykeHttpClient(config);
    await verifyClient(http);
    return new ReplykeClient(http);
  }
}

function bindModule<T extends Record<string, (client: ReplykeHttpClient, ...args: any[]) => any>>(
  module: T,
  client: ReplykeHttpClient
): BoundModule<T> {
  const bound: any = {};
  for (const key in module) {
    bound[key] = (...args: any[]) => module[key](client, ...args);
  }
  return bound;
}

async function verifyClient(client: ReplykeHttpClient): Promise<void> {
  try {
    await client.instance.get("/auth/verify"); // Adjust to your real endpoint
  } catch (err: any) {
    throw new Error("[Replyke] Invalid API key or project ID.");
  }
}
