import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

export const toApiKeyDto = (row: AuthDoc<"apikey">) => ({
  id: String(row._id),
  name: (row.name as string | null) ?? null,
  start: (row.start as string | null) ?? null,
  prefix: (row.prefix as string | null) ?? null,
  enabled: row.enabled !== false,
  createdAt: Number(row.createdAt),
  expiresAt: row.expiresAt != null ? Number(row.expiresAt) : null,
  lastRequest: row.lastRequest != null ? Number(row.lastRequest) : null,
});

export type ApiKeyDto = ReturnType<typeof toApiKeyDto>;
