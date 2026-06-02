import { SublayHttpClient } from "../../core/client";
import { Rule } from "../../interfaces/Rule";

export interface FetchRuleProps {
  spaceId: string;
  ruleId: string;
}

export async function fetchRule(
  client: SublayHttpClient,
  data: FetchRuleProps
): Promise<Rule> {
  const { spaceId, ruleId } = data;
  const response = await client.projectInstance.get<Rule>(
    `/spaces/${spaceId}/rules/${ruleId}`
  );
  return response.data;
}
