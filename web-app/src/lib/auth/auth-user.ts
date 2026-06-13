import { redirect } from "@tanstack/react-router";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

export const getSession = async () => {
  try {
    return await fetchAuthQuery(api.auth.queries.getSession);
  } catch {
    return undefined;
  }
};

export const getUser = async () => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return session.user;
};

export const getRequiredUser = async () => {
  const user = await getUser();

  if (!user) {
    throw redirect({ to: "/auth/signin" });
  }

  return user;
};

export function isAdmin(user: unknown): boolean {
  return (
    typeof user === "object" &&
    user !== null &&
    "role" in user &&
    (user as { role: string }).role === "admin"
  );
}

export const getRequiredAdmin = async () => {
  const user = await getRequiredUser();

  if (!isAdmin(user)) {
    throw redirect({ to: "/" });
  }

  return user;
};
