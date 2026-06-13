import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AutomaticPaginationProps = {
  currentPage: number;
  totalPages: number;
  searchParam?: string;
  paramName?: string;
};

export function AutomaticPagination({
  currentPage,
  totalPages,
  paramName = "page",
}: AutomaticPaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Link
              to="."
              search={(prev) => ({ ...prev, [paramName]: currentPage - 1 })}
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 px-2.5 sm:pl-2.5",
                currentPage === 1 && "pointer-events-none opacity-50",
              )}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:block">Previous</span>
            </Link>
          </PaginationItem>

          {generatePageNumbers().map((pageNum, index) => (
            <PaginationItem key={index}>
              {pageNum === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <Link
                  to="."
                  search={(prev) => ({ ...prev, [paramName]: pageNum })}
                  className={cn(
                    buttonVariants({
                      variant: pageNum === currentPage ? "outline" : "ghost",
                      size: "icon",
                    }),
                  )}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >
                  {pageNum}
                </Link>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <Link
              to="."
              search={(prev) => ({ ...prev, [paramName]: currentPage + 1 })}
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 px-2.5 sm:pr-2.5",
                currentPage === totalPages && "pointer-events-none opacity-50",
              )}
              aria-label="Go to next page"
            >
              <span className="hidden sm:block">Next</span>
              <ChevronRight className="size-4" />
            </Link>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
