import { SublayHttpClient } from "../../core/client";
import { DeleteRuleResponse } from "../../interfaces/Rule";

export interface DeleteRuleProps {
  spaceId: string;
  ruleId: string;
}

export async function deleteRule(
  client: SublayHttpClient,
  data: DeleteRuleProps
): Promise<DeleteRuleResponse> {
  const { spaceId, ruleId } = data;
  const response = await client.projectInstance.delete<DeleteRuleResponse>(
    `/spaces/${spaceId}/rules/${ruleId}`
  );
  return response.data;
}
