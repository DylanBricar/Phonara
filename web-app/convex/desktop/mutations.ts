import { mutation } from "@convex/_generated/server";
import { requireAuth } from "@convex/auth/config";
import { v } from "convex/values";

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const randomToken = () =>
  crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

export const createDeviceLoginSession = mutation({
  args: {
    deviceId: v.optional(v.string()),
    redirectUri: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { session } = await requireAuth(ctx);
    const now = Date.now();
    const code = randomToken().slice(0, 32);
    const redirectUri = args.redirectUri || "parler://auth/callback";

    await ctx.db.insert("deviceLoginSessions", {
      code,
      userId: session.user.id,
      deviceId: args.deviceId,
      redirectUri,
      expiresAt: now + 5 * 60 * 1000,
      createdAt: now,
    });

    return {
      code,
      deepLink: `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}code=${code}`,
      expiresAt: now + 5 * 60 * 1000,
    };
  },
});

export const exchangeDeviceLoginCode = mutation({
  args: {
    code: v.string(),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const login = await ctx.db
      .query("deviceLoginSessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!login || login.consumedAt || login.expiresAt < now) {
      throw new Error("Invalid or expired device login code");
    }

    await ctx.db.patch(login._id, { consumedAt: now });

    const existingDevice = await ctx.db
      .query("desktopDevices")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existingDevice) {
      await ctx.db.patch(existingDevice._id, {
        lastSeenAt: now,
        deviceName: args.deviceName,
        revokedAt: undefined,
      });
    } else {
      await ctx.db.insert("desktopDevices", {
        userId: login.userId,
        deviceId: args.deviceId,
        deviceName: args.deviceName,
        lastSeenAt: now,
        createdAt: now,
      });
    }

    const token = randomToken();
    await ctx.db.insert("desktopTokens", {
      userId: login.userId,
      deviceId: args.deviceId,
      tokenHash: await sha256(token),
      expiresAt: now + 90 * 24 * 60 * 60 * 1000,
      createdAt: now,
    });

    return { token, expiresAt: now + 90 * 24 * 60 * 60 * 1000 };
  },
});
