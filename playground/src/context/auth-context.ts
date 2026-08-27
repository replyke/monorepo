import { createContext } from "react";

export interface MockUser {
  id: string;
  username: string;
}

export interface AuthContextValue {
  user: MockUser | null;
  loading: boolean;
  setUsername: (username: string) => void;
  generateRandomUsername: () => string;
  clearUsername: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
