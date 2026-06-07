export interface OAuthIdentity {
  id: string;
  provider: string;         // e.g. "google", "github"
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface ListIdentitiesResponse {
  identities: OAuthIdentity[];
}
