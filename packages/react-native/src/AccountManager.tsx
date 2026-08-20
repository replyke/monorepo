import * as Keychain from "react-native-keychain";
import { useAccountSync, useProject, handleError } from "@sublay/core";
import type { AccountStorage, AccountMap } from "@sublay/core";

const STORAGE_SERVICE_PREFIX = "sublay-accounts:";

export const keychainStorage: AccountStorage = {
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${STORAGE_SERVICE_PREFIX}${projectId}`,
      });
      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch {
      return null;
    }
  },

  async setAccountMap(projectId: string, map: AccountMap): Promise<void> {
    try {
      const service = `${STORAGE_SERVICE_PREFIX}${projectId}`;
      await Keychain.setGenericPassword(service, JSON.stringify(map), {
        service,
      });
    } catch (error) {
      // Log AND rethrow — see the note in the interface: the write contract
      // rejects on failure, because an await that succeeds on a failed write
      // makes every guarantee built on it fictional.
      handleError(error, "Failed to write account map to Keychain");
      throw error;
    }
  },

  async deleteAccountMap(projectId: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: `${STORAGE_SERVICE_PREFIX}${projectId}`,
      });
    } catch (error) {
      handleError(error, "Failed to delete account map from Keychain");
      throw error;
    }
  },
};

function AccountManager() {
  const { projectId } = useProject();
  useAccountSync(keychainStorage, projectId!);
  return null;
}

export default AccountManager;
