import * as Keychain from "react-native-keychain";
import {
  useAccountSync,
  useProject,
  handleError,
  readStoredAccountMap,
} from "@sublay/core";
import type { AccountStorage, AccountMap } from "@sublay/core";

const STORAGE_SERVICE_PREFIX = "sublay-accounts:";

export const keychainStorage: AccountStorage = {
  /**
   * Tolerant by contract, and VALIDATED rather than cast.
   *
   * The Keychain is a store this adapter does not own: the item survives an
   * app reinstall, is restorable from a device backup written by an older
   * release, and on Android is shared with anything else holding the app's
   * keystore alias. `JSON.parse(credentials.password) as AccountMap` is a claim
   * about those bytes, not a check of them — it accepts syntactically valid
   * JSON carrying an invalid map, and the resulting crash lands far from here.
   * The concrete one: a half-formed stored web subscription reaches
   * `pushIdentifiersEqual`, which dereferences `subscription.keys.p256dh`
   * unguarded. `readStoredAccountMap` is where the claim is earned; see its
   * docblock in core for what each rule is protecting.
   *
   * Unrecognizable bytes read as `null` — the same answer this already gave for
   * a read that threw.
   */
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${STORAGE_SERVICE_PREFIX}${projectId}`,
      });
      if (credentials) {
        return readStoredAccountMap(JSON.parse(credentials.password));
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
