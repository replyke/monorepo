import React, { useEffect, useState } from "react";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { AuthContext, MockUser } from "./auth-context";

const USERNAME_KEY = "playground_username";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved) {
      setUser({ id: saved, username: saved });
    }
    setLoading(false);
  }, []);

  const setUsername = (username: string) => {
    localStorage.setItem(USERNAME_KEY, username);
    setUser({ id: username, username });
  };

  const generateRandomUsername = () =>
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
      length: 3,
      style: "lowerCase",
    });

  const clearUsername = () => {
    localStorage.removeItem(USERNAME_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, setUsername, generateRandomUsername, clearUsername }}
    >
      {children}
    </AuthContext.Provider>
  );
}
