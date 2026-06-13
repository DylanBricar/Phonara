import type { ActionCtx } from "@convex/_generated/server";
import { createAuth } from "@convex/auth/config";

export type ApiKeyVerification =
  | { ok: false; status: number; message: string }
  | { ok: true; organizationId: string };

export const verifyApiKeyForOrg = async (
  ctx: ActionCtx,
  apiKey: string,
): Promise<ApiKeyVerification> => {
  const auth = createAuth(ctx);
  const verification = await auth.api.verifyApiKey({
    body: { key: apiKey },
  });

  if (!verification.valid || !verification.key) {
    return {
      ok: false,
      status: 401,
      message: String(verification.error?.message ?? "Invalid API key"),
    };
  }

  return {
    ok: true,
    organizationId: String(verification.key.referenceId),
  };
};
