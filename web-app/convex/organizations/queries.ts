import { v } from "convex/values";
import { authComponent, createAuth } from "@convex/auth/config";
import { orgQuery } from "@convex/auth/functions";

function getCommandMatchScore(label: string, query: string): number {
  const normalizedLabel = label.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedLabel === normalizedQuery) return 100;
  if (normalizedLabel.startsWith(normalizedQuery)) return 75;
  if (normalizedLabel.includes(` ${normalizedQuery} `)) return 50;
  if (normalizedLabel.includes(normalizedQuery)) return 25;

  const queryWords = normalizedQuery.split(" ");
  const matchingWords = queryWords.filter((word) =>
    normalizedLabel.includes(word),
  );
  return matchingWords.length > 0 ? 10 : 0;
}

export const searchCommand = orgQuery({
  args: {
    organizationSlug: v.string(),
    q: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.q.trim();
    if (!trimmed) return [];

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return [];

    const organization = await auth.api.getFullOrganization({
      headers,
      query: { organizationSlug: args.organizationSlug },
    });
    if (!organization) return [];

    return organization.members
      .map((member) => {
        const label = member.user.name.trim()
          ? member.user.name
          : member.user.email;
        return {
          url: `/orgs/${organization.slug}/settings/members?search=${encodeURIComponent(member.user.email)}`,
          label,
          icon: "member" as const,
          score: getCommandMatchScore(label, trimmed),
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 10)
      .map(({ score: _score, ...rest }) => rest);
  },
});
