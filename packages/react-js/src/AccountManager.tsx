import { useAccountSync, useProject, handleError } from "@sublay/core";
import type { AccountStorage, AccountMap } from "@sublay/core";

const STORAGE_KEY_PREFIX = "sublay-accounts:";

export const webAccountStorage: AccountStorage = {
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setAccountMap(projectId: string, map: AccountMap): Promise<void> {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${projectId}`,
        JSON.stringify(map)
      );
    } catch (error) {
      // Log AND rethrow. The write contract rejects on failure now: an awaited
      // persist that resolves on a failed write is worse than no persist at
      // all, because callers act on it.
      handleError(error, "Failed to write account map to localStorage");
      throw error;
    }
  },

  async deleteAccountMap(projectId: string): Promise<void> {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    } catch (error) {
      handleError(error, "Failed to delete account map from localStorage");
      throw error;
    }
  },
};

function AccountManager() {
  const { projectId } = useProject();
  useAccountSync(webAccountStorage, projectId!);
  return null;
}

export default AccountManager;
