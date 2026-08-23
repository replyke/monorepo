import {
  useAccountSync,
  useProject,
  handleError,
  readStoredAccountMap,
} from "@sublay/core";
import type { AccountStorage, AccountMap } from "@sublay/core";

const STORAGE_KEY_PREFIX = "sublay-accounts:";

export const webAccountStorage: AccountStorage = {
  /**
   * Tolerant by contract, and VALIDATED rather than cast.
   *
   * `localStorage` is a store this adapter does not own: any script on the
   * origin can write this key, and a value the SDK itself wrote can be
   * truncated by a quota failure mid-write. `JSON.parse(raw) as AccountMap` is
   * a claim about those bytes, not a check of them — it accepts syntactically
   * valid JSON carrying an invalid map, and the resulting crash lands far from
   * here. The concrete one: a half-formed stored web subscription reaches
   * `pushIdentifiersEqual`, which dereferences `subscription.keys.p256dh`
   * unguarded. `readStoredAccountMap` is where the claim is earned; see its
   * docblock in core for what each rule is protecting.
   *
   * Unrecognizable bytes read as `null` — the same answer this already gave for
   * bytes that would not parse at all.
   */
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
      return raw ? readStoredAccountMap(JSON.parse(raw)) : null;
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
