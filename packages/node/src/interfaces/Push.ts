export interface PushDeviceResult {
  platform: string;
  success: boolean;
  reason?: string;
}

export interface SendPushResult {
  results: Record<string, PushDeviceResult[]>;
}
