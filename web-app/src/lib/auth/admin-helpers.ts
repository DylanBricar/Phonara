import { authClient } from "@/lib/auth-client";

type AdminUpdateUserData = {
  name?: string;
  email?: string;
  image?: string | null;
  role?: "admin" | "user";
  banned?: boolean;
  banReason?: string;
};

export async function adminUpdateUser(
  userId: string,
  data: AdminUpdateUserData,
) {
  return authClient.admin.updateUser({
    userId,
    data,
  });
}
