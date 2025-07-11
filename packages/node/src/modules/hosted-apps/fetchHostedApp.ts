import { ReplykeHttpClient } from "../../core/client";
import { HostedApp } from "../../interfaces/HostedApp";

export interface FetchHostedAppProps {
  appId: string;
}

export async function fetchHostedApp(
  client: ReplykeHttpClient,
  data: FetchHostedAppProps
): Promise<HostedApp> {
  const path = `/hosted-apps/${data.appId}`;
  const response = await client.internalInstance.get<any>(path);
  return response.data;
}
