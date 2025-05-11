export interface IProjectKeys {
  jwt?: {
    publicKey: string; // Current public key for JWT
    previousPublicKey?: string | null; // Grace period key
    keyUpdatedAt?: Date; // Timestamp of last key update
  };
  secret?: {
    key: string;
    keyUpdatedAt?: Date;
  };
}
