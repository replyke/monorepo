import { Sequelize } from "sequelize";

export interface CoreConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  sequelize: Sequelize;
  handlers: {
    createEntity: (props: { projectId: string }) => Promise<void>;
    createComment: (props: { projectId: string }) => Promise<void>;
    uploadFile: (props: {
      projectId: string;
      fileSize: number;
    }) => Promise<void>;
    requestNewAccessToken: (props: {
      projectId: string;
      userId: string;
    }) => Promise<void>;
  };
  createFile(
    projectId: string,
    pathParts: string[],
    file: Buffer | Blob,
    contentType?: string
  ): Promise<{
    id: string;
    path: string;
    fullPath: string;
    publicPath: string;
  }>;
}

let config: CoreConfig;

export function setCoreConfig(c: CoreConfig) {
  config = c;
}

export function getCoreConfig(): CoreConfig {
  if (!config) {
    throw new Error(
      "Core config has not been set. Please call setCoreConfig() at startup."
    );
  }
  return config;
}
