import type { AppSettings } from "@/bindings";

/**
 * Rust accepts partial persisted settings so older files can be migrated, but
 * every settings command serializes a complete AppSettings value at runtime.
 * Keep those two contracts distinct so UI updates can never persist undefined.
 */
export type RuntimeSettings = Required<AppSettings>;

export const asRuntimeSettings = (settings: AppSettings): RuntimeSettings =>
  settings as RuntimeSettings;
