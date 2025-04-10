import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  apiKey: string;
  projectId: string;
  isInternal?: boolean;
}

export class ReplykeHttpClient {
  instance: AxiosInstance;

  constructor({ apiKey, projectId, isInternal }: ClientConfig) {
    this.instance = axios.create({
      baseURL: `https://api.replyke.com/api/v1/${projectId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(isInternal && { "X-Replyke-Internal": "true" }),
      },
    });
  }
}
