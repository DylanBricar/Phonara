export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role?: string;
  joinedAt?: number;
};
