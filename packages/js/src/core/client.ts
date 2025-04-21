import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  projectId: string;
}

export class ReplykeHttpClient {
  instance: AxiosInstance;

  constructor({ projectId }: ClientConfig) {
    this.instance = axios.create({
      baseURL: `https://api.replyke.com/api/v5/${projectId}`,
    });
  }
}
