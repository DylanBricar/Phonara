import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { feedbackColumns, type Feedback } from "./feedback-columns";
import { FeedbackFilters } from "./feedback-filters";

const PAGE_SIZE = 10;

type FeedbackTableProps = {
  search: string;
};

export const FeedbackTable = ({ search }: FeedbackTableProps) => {
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [previousSearch, setPreviousSearch] = useState(search);

  // Reset pagination state when search changes (React docs: adjusting state
  // during render instead of in an effect).
  if (previousSearch !== search) {
    setPreviousSearch(search);
    setCursorStack([null]);
  }

  const currentCursor = cursorStack[cursorStack.length - 1];

  const feedbackData = useQuery(api.admin.feedbacks.listFeedback, {
    cursor: currentCursor,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });

  const feedback = (feedbackData?.page ?? []) as Feedback[];
  const isLoading = feedbackData === undefined;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: feedback,
    columns: feedbackColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const canGoPrevious = cursorStack.length > 1;
  const canGoNext = Boolean(feedbackData && !feedbackData.isDone);

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    setCursorStack((stack) => stack.slice(0, -1));
  };

  const handleNext = () => {
    if (!canGoNext || !feedbackData) return;
    setCursorStack((stack) => [...stack, feedbackData.continueCursor]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FeedbackFilters />
        <DataTableViewOptions table={table} />
      </div>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyMessage="No feedback found."
      />

      {(canGoPrevious || canGoNext) && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:block">Previous</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Go to next page"
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
