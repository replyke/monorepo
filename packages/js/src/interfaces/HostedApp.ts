export interface HostedApp{
  id: string; // UUID for unique identification
  projectId: string; // The ID of the user who submitted the report
  name: string;
  type: "discord-board";
  subdomain: string;
  metadata: Record<string, any>;
  createdAt: string; // Timestamp of when the report was created
  updatedAt: string;
  deletedAt: string | null; // Timestamp of the last update to the report
}
