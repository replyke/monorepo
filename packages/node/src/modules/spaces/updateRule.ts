import { ReplykeHttpClient } from "../../core/client";
import { Rule } from "../../interfaces/Rule";

export interface UpdateRuleProps {
  spaceId: string;
  ruleId: string;
  title?: string;
  description?: string;
}

export async function updateRule(
  client: ReplykeHttpClient,
  data: UpdateRuleProps
): Promise<Rule> {
  const { spaceId, ruleId, ...body } = data;
  const response = await client.projectInstance.patch<Rule>(
    `/spaces/${spaceId}/rules/${ruleId}`,
    body
  );
  return response.data;
}
