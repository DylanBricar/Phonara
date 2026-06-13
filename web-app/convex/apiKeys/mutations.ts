import { v } from "convex/values";
import { components } from "@convex/_generated/api";
import { orgMutation } from "@convex/auth/functions";
import { toApiKeyDto } from "@convex/apiKeys/dto/apiKey";
import type { Doc as AuthDoc } from "@convex/betterAuth/_generated/dataModel";

const API_KEY_PREFIX = "nsk_";
const API_KEY_RANDOM_LENGTH = 64;
const API_KEY_START_LENGTH = 6;
const API_KEY_RATE_LIMIT_MAX = 1000;
const API_KEY_RATE_LIMIT_WINDOW = 1000 * 60 * 60;
const KEY_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");

const generateApiKey = () => {
  let randomPart = "";
  const maxValidByte = 256 - (256 % KEY_ALPHABET.length);

  while (randomPart.length < API_KEY_RANDOM_LENGTH) {
    const bytes = new Uint8Array(API_KEY_RANDOM_LENGTH);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= maxValidByte) continue;

      randomPart += KEY_ALPHABET[byte % KEY_ALPHABET.length];
      if (randomPart.length === API_KEY_RANDOM_LENGTH) break;
    }
  }

  return `${API_KEY_PREFIX}${randomPart}`;
};

const hashApiKey = async (key: string) => {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );

  return toBase64Url(new Uint8Array(hash));
};

export const createForOrganization = orgMutation({
  permission: { apiKey: ["create"] },
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();

    if (!name) throw new Error("Enter a key name.");
    if (name.length > 32) {
      throw new Error("Key name must be 32 characters or fewer.");
    }

    const key = generateApiKey();
    const now = Date.now();
    const row = (await ctx.runMutation(
      components.betterAuth.data.createApiKey,
      {
        data: {
          configId: "default",
          name,
          start: key.substring(0, API_KEY_START_LENGTH),
          referenceId: args.organizationId,
          prefix: API_KEY_PREFIX,
          key: await hashApiKey(key),
          refillInterval: null,
          refillAmount: null,
          lastRefillAt: null,
          enabled: true,
          rateLimitEnabled: true,
          rateLimitTimeWindow: API_KEY_RATE_LIMIT_WINDOW,
          rateLimitMax: API_KEY_RATE_LIMIT_MAX,
          requestCount: 0,
          remaining: null,
          lastRequest: null,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
          permissions: null,
          metadata: null,
        },
      },
    )) as AuthDoc<"apikey"> | null;

    if (!row) throw new Error("Failed to create API key.");

    return {
      ...toApiKeyDto(row),
      key,
    };
  },
});

export const removeForOrganization = orgMutation({
  permission: { apiKey: ["delete"] },
  args: { keyId: v.string() },
  handler: async (ctx, args) => {
    const deleted = (await ctx.runMutation(
      components.betterAuth.data.deleteApiKeyForOrganization,
      {
        keyId: args.keyId,
        organizationId: args.organizationId,
      },
    )) as boolean;

    if (!deleted) throw new Error("API key not found.");

    return { ok: true as const };
  },
});
