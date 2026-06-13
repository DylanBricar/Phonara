import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { DocTree } from "../doc-manager";

const METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600 dark:text-blue-400",
  POST: "text-green-600 dark:text-green-400",
  PUT: "text-purple-600 dark:text-purple-400",
  PATCH: "text-yellow-600 dark:text-yellow-400",
  DELETE: "text-red-600 dark:text-red-400",
};

type DocsSidebarProps = {
  tree: DocTree;
};

function DocsSidebarNav({ tree }: DocsSidebarProps) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-5">
      {tree.rootDocs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
            Getting Started
          </h4>
          <ul className="flex flex-col pl-2">
            {tree.rootDocs.map((doc) => {
              const isActive = doc.url === pathname;
              return (
                <li key={doc.slug}>
                  <Link
                    to={doc.url}
                    className={cn(
                      "block rounded px-2 py-1 text-[13px] transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {doc.attributes.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tree.folders.map((folder) => (
        <div key={folder.slug} className="flex flex-col gap-2">
          <h4 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
            {folder.name}
          </h4>
          <ul className="flex flex-col pl-2">
            {folder.docs.map((doc) => {
              const isActive = doc.url === pathname;
              const method = doc.attributes.method;
              return (
                <li key={doc.slug}>
                  <Link
                    to={doc.url}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2 py-1 text-[13px] transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {method && (
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[10px] font-semibold",
                          METHOD_COLORS[method] ?? "text-muted-foreground",
                        )}
                      >
                        {method}
                      </span>
                    )}
                    <span className="truncate">{doc.attributes.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar({ tree }: DocsSidebarProps) {
  return (
    <aside className="sticky top-12 hidden h-[calc(100vh-3rem)] w-64 shrink-0 overflow-y-auto border-r lg:block">
      <div className="p-4">
        <DocsSidebarNav tree={tree} />
      </div>
    </aside>
  );
}

export function DocsMobileHeader({ tree }: DocsSidebarProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const currentDoc = useMemo(() => {
    const allDocs = [...tree.rootDocs, ...tree.folders.flatMap((f) => f.docs)];
    return allDocs.find((doc) => doc.url === pathname);
  }, [tree, pathname]);

  const currentFolder = useMemo(() => {
    return tree.folders.find((folder) =>
      folder.docs.some((doc) => doc.url === pathname),
    );
  }, [tree, pathname]);

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-12 z-40 flex h-12 items-center gap-4 border-b px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon-sm">
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-6">
            <DocsSidebarNav tree={tree} />
          </div>
        </SheetContent>
      </Sheet>
      {currentDoc && (
        <span className="text-muted-foreground truncate text-sm">
          {currentFolder && (
            <>
              <span className="text-muted-foreground/60">
                {currentFolder.name}
              </span>
              <span className="text-muted-foreground/40 mx-2">/</span>
            </>
          )}
          <span className="text-foreground font-medium">
            {currentDoc.attributes.title}
          </span>
        </span>
      )}
    </div>
  );
}
