import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  apiKey: string;
  projectId: string;
  isInternal?: boolean;
}

export class ReplykeHttpClient {
  projectInstance: AxiosInstance;
  internalInstance: AxiosInstance;
  baseInstance: AxiosInstance;

  constructor({ apiKey, projectId, isInternal }: ClientConfig) {
    this.projectInstance = axios.create({
      baseURL: `https://api.replyke.com/api/v5/${projectId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(isInternal && { "X-Replyke-Internal": "true" }),
      },
    });

    this.internalInstance = axios.create({
      baseURL: "https://api.replyke.com/internal",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(isInternal && { "X-Replyke-Internal": "true" }),
      },
    });

    this.baseInstance = axios.create({
      baseURL: "https://api.replyke.com",
    });
  }
}
