import { Input } from "@/components/ui/input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect } from "react";

export const FeedbackFilters = () => {
  const { search } = useSearch({ from: "/admin/feedback/" });
  const navigate = useNavigate({ from: "/admin/feedback/" });

  useEffect(() => {
    if (search.trim()) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("search")) return;

    searchParams.delete("search");

    const queryString = searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`,
    );
  }, [search]);

  return (
    <div className="relative max-w-sm flex-1">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => {
          const nextSearch = e.target.value.trim();

          void navigate({
            replace: true,
            search: (prev) => ({
              ...prev,
              search: nextSearch || undefined,
            }),
          });
        }}
        className="pl-9"
      />
    </div>
  );
};
