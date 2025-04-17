import { ReplykeHttpClient } from "../../core/client";

export interface FetchHostedAppProps {
  appId: string;
}

export async function fetchHostedApp(
  client: ReplykeHttpClient,
  data: FetchHostedAppProps
): Promise<any> {
  const path = `/hosted-apps/${data.appId}`;
  const response = await client.instance.get<any>(path);
  return response.data;
}
