import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  projectId: string;
  apiKey: string;
  isInternal?: boolean;
}

export class ReplykeHttpClient {
  projectInstance: AxiosInstance;
  internalInstance: AxiosInstance;
  baseInstance: AxiosInstance;

  constructor({ projectId, apiKey, isInternal }: ClientConfig) {
    this.projectInstance = axios.create({
      baseURL: `https://api.replyke.com/api/v5/${projectId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Replyke-Project-ID": projectId,
        ...(isInternal && { "X-Replyke-Internal": "true" }),
      },
    });

    this.internalInstance = axios.create({
      baseURL: "https://api.replyke.com/internal",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Replyke-Project-ID": projectId,
        ...(isInternal && { "X-Replyke-Internal": "true" }),
      },
    });

    this.baseInstance = axios.create({
      baseURL: "https://api.replyke.com",
    });
  }
}
