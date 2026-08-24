import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface CreateWorkspaceProps {
  name: string;
  metadata?: Record<string, any>;
  // Optional parent for child creation; absent → root workspace.
  parentWorkspaceId?: string | null;
}

/**
 * Create a root or child workspace. The creator (the bearer-token user) becomes
 * the owner. Root creation requires a verified email.
 */
export async function createWorkspace(
  client: SublayHttpClient,
  data: CreateWorkspaceProps
): Promise<Workspace> {
  const response = await client.projectInstance.post<Workspace>(
    "/workspaces",
    data
  );
  return response.data;
}
