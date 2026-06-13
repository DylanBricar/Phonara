import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { InlineTooltip } from "@/components/ui/tooltip";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { getInitials } from "@/lib/utils/initials";
import { createNoIndexHead } from "@/lib/seo";
import { FeedbackReplyButton } from "../_components/feedback-reply-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Angry, ChevronRight, Frown, Meh, SmilePlus } from "lucide-react";
import { SiteConfig } from "@/site-config";

const ReviewIcons = [
  { value: 1, icon: Angry, tooltip: "Extremely Dissatisfied" },
  { value: 2, icon: Frown, tooltip: "Somewhat Dissatisfied" },
  { value: 3, icon: Meh, tooltip: "Neutral" },
  { value: 4, icon: SmilePlus, tooltip: "Satisfied" },
];

export const Route = createFileRoute("/admin/feedback/$feedbackId/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Feedback Detail",
      description: `Review a ${SiteConfig.title} platform feedback item.`,
      path: `/admin/feedback/${params.feedbackId}`,
      section: "Admin",
    }),
  component: FeedbackDetailPage,
  pendingComponent: FeedbackDetailSkeleton,
});

function FeedbackDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-lg border p-4">
          <Skeleton className="size-6 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}

function FeedbackDetailPage() {
  const { feedbackId } = Route.useParams();
  const feedback = useQuery(api.admin.feedbacks.getFeedbackById, {
    id: feedbackId as Id<"feedbacks">,
  });
  if (feedback === undefined) return null;
  if (!feedback) return <div>Feedback not found</div>;
  const reviewIcon = ReviewIcons.find((icon) => icon.value === feedback.review);
  const displayName = feedback.user?.name ?? "Anonymous";
  const displayEmail = feedback.user?.email ?? feedback.email ?? "No email";

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Feedback</LayoutTitle>
        <LayoutDescription>
          Submitted {new Date(feedback.createdAt).toLocaleDateString()}
        </LayoutDescription>
      </LayoutHeader>
      <LayoutContent className="space-y-6">
        {feedback.user ? (
          <Item variant="outline" asChild>
            <Link
              to="/admin/users/$userId"
              params={{ userId: feedback.user.id }}
              className="cursor-pointer"
            >
              <ItemMedia>
                <Avatar className="size-10">
                  <AvatarImage
                    src={feedback.user.image ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {displayName}
                  <Badge variant="outline" className="text-xs">
                    {feedback.user.role ?? "user"}
                  </Badge>
                </ItemTitle>
                <ItemDescription>{displayEmail}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="text-muted-foreground size-5" />
              </ItemActions>
            </Link>
          </Item>
        ) : (
          <Item variant="outline">
            <ItemMedia>
              <Avatar className="size-10">
                <AvatarFallback>{displayEmail[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Anonymous</ItemTitle>
              <ItemDescription>{displayEmail}</ItemDescription>
            </ItemContent>
          </Item>
        )}
        <Item variant="outline">
          <ItemMedia>
            {reviewIcon && (
              <InlineTooltip title={reviewIcon.tooltip}>
                <reviewIcon.icon size={24} className="text-primary" />
              </InlineTooltip>
            )}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{reviewIcon?.tooltip ?? "No rating"}</ItemTitle>
            <ItemDescription className="whitespace-pre-wrap">
              {feedback.message}
            </ItemDescription>
          </ItemContent>
        </Item>
        <FeedbackReplyButton
          feedbackId={feedback.id}
          recipientName={displayName}
        />
      </LayoutContent>
    </Layout>
  );
}
