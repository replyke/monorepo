import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface CreateWorkspaceProps {
  // The user the workspace is created as (becomes the owner). Required for the
  // service key — the server derives no session user from a service key.
  actingUserId: string;
  name: string;
  metadata?: Record<string, any>;
  // Optional parent for child creation; absent → root workspace.
  parentWorkspaceId?: string | null;
}

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
