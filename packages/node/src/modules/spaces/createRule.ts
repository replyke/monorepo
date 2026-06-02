import { SublayHttpClient } from "../../core/client";
import { Rule } from "../../interfaces/Rule";

export interface CreateRuleProps {
  spaceId: string;
  title: string;
  description?: string;
}

export async function createRule(
  client: SublayHttpClient,
  data: CreateRuleProps
): Promise<Rule> {
  const { spaceId, ...body } = data;
  const response = await client.projectInstance.post<Rule>(
    `/spaces/${spaceId}/rules`,
    body
  );
  return response.data;
}
