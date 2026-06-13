export type OrganizationMember = {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  organizationId: string;
  inviterId: string;
  expiresAt: number;
  createdAt: number;
};
