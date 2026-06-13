import {
  adminClient,
  emailOTPClient,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  plugins: [
    magicLinkClient(),
    organizationClient(),
    apiKeyClient(),
    adminClient(),
    emailOTPClient(),
    lastLoginMethodClient(),
    convexClient(),
  ],
});

export type AuthClientType = typeof authClient;

export const { useSession, signOut } = authClient;
