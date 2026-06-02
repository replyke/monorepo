import { SublayHttpClient } from "../../core/client";
import { Rule } from "../../interfaces/Rule";

export interface ReorderRulesProps {
  spaceId: string;
  ruleIds: string[];
}

export async function reorderRules(
  client: SublayHttpClient,
  data: ReorderRulesProps
): Promise<Rule[]> {
  const { spaceId, ruleIds } = data;
  const response = await client.projectInstance.patch<Rule[]>(
    `/spaces/${spaceId}/rules/reorder`,
    { ruleIds }
  );
  return response.data;
}
