import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

export async function getUsersOrgs() {
  const userOrganizations = await fetchAuthQuery(
    api.auth.queries.listOrganizations,
    {},
  );

  return userOrganizations;
}
