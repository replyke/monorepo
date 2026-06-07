// Define the attributes of the Project model
export interface Project {
  id: string; // Sequelize auto-generates `id`, and it's optional on creation
  clientId: string;
  name: string;
  integrations: {
    id: string;
    projectId: string;
    name: string;
    data: Record<string, any>;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
