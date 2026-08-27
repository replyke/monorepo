import axios, { AxiosInstance } from "axios";

export interface ClientConfig {
  projectId: string;
  apiKey: string;
  isInternal?: boolean;
}

export class SublayHttpClient {
  projectInstance: AxiosInstance;
  internalInstance: AxiosInstance;
  baseInstance: AxiosInstance;

  constructor({ projectId, apiKey, isInternal }: ClientConfig) {
    this.projectInstance = axios.create({
      baseURL: `https://api.sublay.io/v7/${projectId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Sublay-Project-ID": projectId,
        ...(isInternal && { "X-Sublay-Internal": "true" }),
      },
    });

    this.internalInstance = axios.create({
      baseURL: "https://api.sublay.io/internal",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Sublay-Project-ID": projectId,
        ...(isInternal && { "X-Sublay-Internal": "true" }),
      },
    });

    this.baseInstance = axios.create({
      baseURL: "https://api.sublay.io",
    });
  }
}
