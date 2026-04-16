export interface Collection {
  id: string;
  projectId: string;
  userId: string;
  parentId: string | null;
  name: string;
  entityCount: number;
  createdAt: Date;
  updatedAt: Date;
}
