import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export const nowStackDialogContentClass =
  "gap-0 overflow-hidden !rounded-xl border-none p-0 pb-10 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800";

export function NowStackDialogContent({
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(nowStackDialogContentClass, className)}
      {...props}
    />
  );
}

export function NowStackDialogHeader({
  className,
  bordered = true,
  centered = false,
  ...props
}: React.ComponentProps<typeof DialogHeader> & {
  bordered?: boolean;
  centered?: boolean;
}) {
  return (
    <DialogHeader
      className={cn(
        "px-5 py-4",
        bordered && "border-b",
        centered && "flex flex-col items-center gap-2",
        className,
      )}
      {...props}
    />
  );
}

export function NowStackDialogFooterBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export function NowStackDialogEscButton({
  label = "Close",
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  label?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "text-muted-foreground h-auto gap-1.5 px-1.5 py-1 text-xs font-medium",
        className,
      )}
      {...props}
    >
      <Kbd className="size-5 text-[10px]">Esc</Kbd>
      <span>{label}</span>
    </Button>
  );
}

export function NowStackDialogCloseButton({
  label = "Close",
}: {
  label?: string;
}) {
  return (
    <DialogClose
      render={
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-auto gap-1.5 px-1.5 py-1 text-xs font-medium"
        />
      }
    >
      <Kbd className="size-5 text-[10px]">Esc</Kbd>
      <span>{label}</span>
    </DialogClose>
  );
}

export function NowStackDialogEnterHint() {
  return (
    <Kbd className="size-5 border border-current/20 bg-current/10 text-[10px] text-inherit">
      ↵
    </Kbd>
  );
}
