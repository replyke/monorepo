import { ReplykeHttpClient } from "../../core/client";
import { FetchManyRulesResponse } from "../../interfaces/Rule";

export interface FetchManyRulesProps {
  spaceId: string;
}

export async function fetchManyRules(
  client: ReplykeHttpClient,
  data: FetchManyRulesProps
): Promise<FetchManyRulesResponse> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<FetchManyRulesResponse>(
    `/spaces/${spaceId}/rules`
  );
  return response.data;
}
