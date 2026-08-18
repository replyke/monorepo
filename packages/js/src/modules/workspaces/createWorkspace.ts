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
  // Client SDKs never send an actor `userId` — acting on behalf of another
  // user is the node-sdk service-key capability. Strip it defensively in
  // case a caller casts around the props type.
  const body: Record<string, any> = { ...data };
  delete body.userId;

  const response = await client.projectInstance.post<Workspace>(
    "/workspaces",
    body
  );
  return response.data;
}
