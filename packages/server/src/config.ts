// export interface FileStorageProvider {
//   uploadFile: (buffer: Buffer, path: string) => Promise<string>;
// }

import { RedisClientType } from "redis";
import { Sequelize } from "sequelize";

// export interface EmailProvider {
//   sendEmail: (params: {
//     to: string;
//     subject: string;
//     text: string;
//     html?: string;
//   }) => Promise<void>;
// }

export interface CoreConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  redisClient: RedisClientType;
  sequelize: Sequelize;
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
