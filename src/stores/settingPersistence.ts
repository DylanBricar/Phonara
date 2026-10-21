interface OptimisticSettingUpdate<T extends object, K extends keyof T> {
  settings: T | null;
  key: K;
  value: T[K];
  updateSettings: (updater: (settings: T | null) => T | null) => void;
  setUpdating: (key: string, updating: boolean) => void;
  isUpdating: (key: string) => boolean;
  persist: (value: T[K]) => Promise<unknown>;
  reportError?: (message: string, error: unknown) => void;
}

/** Persist one optimistic edit without rolling back other keys on failure. */
export async function updateSettingOptimistically<
  T extends object,
  K extends keyof T,
>({
  settings,
  key,
  value,
  updateSettings,
  setUpdating,
  isUpdating,
  persist,
  reportError = console.error,
}: OptimisticSettingUpdate<T, K>): Promise<boolean> {
  const updateKey = String(key);
  if (!settings || isUpdating(updateKey)) return false;
  const originalValue = settings[key];
  setUpdating(updateKey, true);
  try {
    updateSettings((current) =>
      current ? { ...current, [key]: value } : null,
    );
    const result = await persist(value);
    if (
      typeof result === "object" &&
      result !== null &&
      "status" in result &&
      result.status === "error"
    ) {
      throw new Error(
        "error" in result ? String(result.error) : "Setting update failed",
      );
    }
    return true;
  } catch (error) {
    updateSettings((current) =>
      current ? { ...current, [key]: originalValue } : null,
    );
    reportError(`Failed to update setting "${updateKey}":`, error);
    return false;
  } finally {
    setUpdating(updateKey, false);
  }
}
