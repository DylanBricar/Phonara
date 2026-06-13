import { Card, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { Post } from "./post-manager";

type PostCardProps = {
  post: Post;
  variant?: "default" | "compact";
  className?: string;
};

export const PostCard = ({
  post,
  variant = "default",
  className,
}: PostCardProps) => {
  const { title, description, coverUrl, date } = post.attributes;

  if (variant === "compact") {
    return (
      <Link
        to="/posts/$slug"
        params={{ slug: post.slug }}
        className="group block"
      >
        <Card
          size="sm"
          className={cn(
            "group-hover:border-foreground/20 transition-colors",
            className,
          )}
        >
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Typography
                variant="large"
                as="h3"
                className="text-base group-hover:underline"
              >
                {title}
              </Typography>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <time>{formatDate(date)}</time>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-foreground/30"
    >
      <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl border border-border">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="size-full object-cover"
            width={1200}
            height={630}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-2 pt-1">
        <time className="text-muted-foreground text-sm">{formatDate(date)}</time>
        <h3 className="text-foreground text-xl font-semibold leading-snug tracking-tight">
          {title}
        </h3>
        {description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 px-2 pb-1">
        <div className="flex items-center gap-2">
          <img
            src={SiteConfig.team.image}
            alt={SiteConfig.team.name}
            className="ring-border size-6 rounded-full object-cover ring-1"
            width={24}
            height={24}
            loading="lazy"
            decoding="async"
          />
          <span className="text-foreground text-sm">
            {SiteConfig.team.name}
          </span>
        </div>
        <span className="text-foreground flex items-center gap-1 text-sm">
          Read
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
};
