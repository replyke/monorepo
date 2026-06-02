import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  projectId: string;
}

export class SublayHttpClient {
  instance: AxiosInstance;

  constructor({ projectId }: ClientConfig) {
    this.instance = axios.create({
      baseURL: `https://api.sublay.io/api/v5/${projectId}`,
    });
  }
}
