import type { AccountMap } from "../store/slices/accountsSlice";

/**
 * Durable, project-scoped storage for the account map. One implementation per
 * platform package (`@sublay/expo`, `@sublay/react-js`,
 * `@sublay/react-native`), parallel to `PushTokenAdapter`.
 *
 * Implementations do not need their own locking: core serializes every call
 * per projectId (see `config/accountStorage`).
 */
export interface AccountStorage {
  /**
   * Tolerant by contract: an unreadable, corrupt or unrecognized store reads as
   * `null` (or as an empty signed-out map) rather than throwing. Nothing useful
   * can be done with a read failure at any call site, and a throw here would
   * take the whole bootstrap down.
   */
  getAccountMap(projectId: string): Promise<AccountMap | null>;

  /**
   * **Must reject when the write does not land.**
   *
   * Every adapter used to `catch → handleError → resolve void`, which made
   * `await storage.setAccountMap(...)` succeed on a failed write. Any guarantee
   * built on that await was fictional — most dangerously "the rotated refresh
   * token is durably stored", where believing a failed write means re-presenting
   * a revoked token and destroying that account's whole token family.
   *
   * Logging the failure on the way out is still fine; swallowing it is not.
   */
  setAccountMap(projectId: string, map: AccountMap): Promise<void>;

  /** Must reject when the wipe does not complete. See `setAccountMap`. */
  deleteAccountMap(projectId: string): Promise<void>;
}
