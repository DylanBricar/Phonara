import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";
import { ChangelogDialog } from "./changelog-dialog";
import type { Changelog } from "./changelog-manager";

const DISMISSED_CHANGELOGS_KEY = "dismissed-changelogs";

function getDismissedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_CHANGELOGS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDismissedSlugs(slugs: string[]) {
  localStorage.setItem(DISMISSED_CHANGELOGS_KEY, JSON.stringify(slugs));
}

export function resetDismissedChangelogs() {
  localStorage.removeItem(DISMISSED_CHANGELOGS_KEY);
}

type ChangelogSidebarStackProps = {
  changelogs: Changelog[];
  className?: string;
};

export function ChangelogSidebarStack({
  changelogs: initialChangelogs,
  className,
}: ChangelogSidebarStackProps) {
  const [dismissedSlugs, setDismissedSlugs] = useState(getDismissedSlugs);
  const [selectedChangelog, setSelectedChangelog] = useState<Changelog | null>(
    null,
  );

  const changelogs = initialChangelogs.filter(
    (c) => !dismissedSlugs.includes(c.slug),
  );

  const handleDismissAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = [...dismissedSlugs, ...changelogs.map((c) => c.slug)];
    setDismissedSlugs(updated);
    saveDismissedSlugs(updated);
  };

  if (changelogs.length === 0) {
    return null;
  }

  const visibleCards = changelogs.slice(0, 3);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between px-1">
        <p className="text-muted-foreground text-[11px] font-medium">
          What&apos;s new
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-5 px-1 text-[11px]"
          onClick={handleDismissAll}
        >
          <X className="size-3" />
          Dismiss
        </Button>
      </div>
      <div
        className="relative w-full"
        style={{ paddingBottom: (visibleCards.length - 1) * 6 }}
        data-changelog-stack
      >
        {visibleCards.map((changelog, index) => {
          const { attributes } = changelog;
          const isFirst = index === 0;

          return (
            <button
              type="button"
              key={changelog.slug}
              className={cn(
                "bg-card focus-visible:ring-ring w-full cursor-pointer overflow-hidden rounded-lg border text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none",
                isFirst ? "relative" : "absolute inset-x-0 top-0",
              )}
              style={{
                ...(isFirst
                  ? { zIndex: visibleCards.length }
                  : {
                      transform: `translateY(${index * 6}px) scale(${1 - index * 0.04})`,
                      zIndex: visibleCards.length - index,
                      transformOrigin: "top center",
                    }),
              }}
              onClick={() => setSelectedChangelog(changelog)}
            >
              {isFirst && attributes.image && (
                <div className="relative aspect-[3/1] w-full overflow-hidden">
                  <img
                    src={attributes.image}
                    alt={attributes.title ?? "Changelog"}
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {attributes.title ?? "New Update"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatDate(attributes.date)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <ChangelogDialog
        changelog={selectedChangelog}
        onOpenChange={(open) => {
          if (!open) setSelectedChangelog(null);
        }}
      />
    </div>
  );
}
