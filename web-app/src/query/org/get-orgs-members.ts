type Member = {
  id: string;
  role: string;
  userId: string;
  user: {
    image?: string;
    id: string;
    name: string;
    email: string;
  };
};

export type OrgMembers = Member[];
