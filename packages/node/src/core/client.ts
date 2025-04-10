import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
}

export class ReplykeHttpClient {
  instance: AxiosInstance;

  constructor({
    apiKey,
    projectId,
    baseUrl = `https://api.replyke.com/api/v1/${projectId}`,
  }: ClientConfig) {
    this.instance = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }
}
