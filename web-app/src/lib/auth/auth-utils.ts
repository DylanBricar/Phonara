export const DEFAULT_AUTH_CALLBACK_URL = "/orgs";

function isUnsafeCallbackUrl(value: string) {
  const hasControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

  return (
    value.startsWith("//") ||
    value.includes("\\") ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) ||
    hasControlCharacter
  );
}

function normalizeInternalPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || isUnsafeCallbackUrl(trimmed)) {
    return null;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path === "/auth/signin" || path.startsWith("/auth/signin/")) {
    return null;
  }
  if (path === "/auth/signup" || path.startsWith("/auth/signup/")) {
    return null;
  }

  return path;
}

export function normalizeAuthCallbackUrl(
  callbackUrl: string | null | undefined,
  fallbackUrl = DEFAULT_AUTH_CALLBACK_URL,
) {
  const fallback =
    normalizeInternalPath(fallbackUrl) ?? DEFAULT_AUTH_CALLBACK_URL;
  return normalizeInternalPath(callbackUrl ?? "") ?? fallback;
}

export const getCallbackUrl = normalizeAuthCallbackUrl;
