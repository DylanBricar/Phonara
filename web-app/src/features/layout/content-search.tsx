import { CmdOrOption } from "@/components/nowts/keyboard-shortcut";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useRouter } from "@tanstack/react-router";
import {
  BookOpen,
  CornerDownLeft,
  FileText,
  Home,
  Info,
  Mail,
  Newspaper,
  Search,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const PAGES = [
  { href: "/", label: "Home", icon: Home },
  { href: "/docs", label: "Documentation", icon: BookOpen },
  { href: "/posts", label: "Blog", icon: Newspaper },
  { href: "/changelog", label: "Changelog", icon: FileText },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
] as const;

function ContentCommandItem({
  children,
  className,
  ...props
}: ComponentProps<typeof CommandItem>) {
  return (
    <CommandItem
      className={cn(
        "data-[selected=true]:border-input data-[selected=true]:bg-input/50 h-9 rounded-md border border-transparent !px-3 font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </CommandItem>
  );
}

export function ContentSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground hidden items-center gap-2 rounded-md px-2.5 py-1 text-xs transition-colors md:flex"
      >
        <Search className="size-3" />
        <span>Search documentation</span>
        <KbdGroup className="ml-2">
          <Kbd>
            <CmdOrOption />
          </Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 sm:max-w-xl dark:bg-neutral-900 dark:ring-neutral-800"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search documentation...</DialogTitle>
            <DialogDescription>
              Search for a page to navigate to...
            </DialogDescription>
          </DialogHeader>
          <Command className="rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0">
            <CommandInput placeholder="Search pages..." />
            <CommandList className="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
              <CommandEmpty className="text-muted-foreground py-12 text-center text-sm">
                No results found.
              </CommandEmpty>
              <CommandGroup
                heading="Navigation"
                className="!p-0 [&_[cmdk-group-heading]]:scroll-mt-16 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1"
              >
                {PAGES.map((page) => (
                  <ContentCommandItem
                    key={page.href}
                    onSelect={() => {
                      void router.navigate({ to: page.href });
                      setOpen(false);
                    }}
                  >
                    <page.icon className="size-4" />
                    <span>{page.label}</span>
                  </ContentCommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800">
            <div className="flex items-center gap-2">
              <Kbd>
                <CornerDownLeft className="size-3" />
              </Kbd>
              Go to Page
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
