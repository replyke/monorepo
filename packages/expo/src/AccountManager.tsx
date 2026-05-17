import * as SecureStore from "expo-secure-store";
import { useAccountSync, useProject, handleError } from "@sublay/core";
import type { AccountStorage, AccountMap } from "@sublay/core";

// expo-secure-store rejects keys containing `:` on iOS — keys must match
// /^[A-Za-z0-9._-]+$/. Use `_` as the separator instead.
const STORAGE_KEY_PREFIX = "sublay-accounts_";

const secureStoreStorage: AccountStorage = {
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    try {
      const raw = await SecureStore.getItemAsync(
        `${STORAGE_KEY_PREFIX}${projectId}`
      );
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setAccountMap(projectId: string, map: AccountMap): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        `${STORAGE_KEY_PREFIX}${projectId}`,
        JSON.stringify(map)
      );
    } catch (error) {
      handleError(error, "Failed to write account map to SecureStore");
    }
  },

  async deleteAccountMap(projectId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(
        `${STORAGE_KEY_PREFIX}${projectId}`
      );
    } catch (error) {
      handleError(error, "Failed to delete account map from SecureStore");
    }
  },
};

function AccountManager() {
  const { projectId } = useProject();
  useAccountSync(secureStoreStorage, projectId!);
  return null;
}

export default AccountManager;
