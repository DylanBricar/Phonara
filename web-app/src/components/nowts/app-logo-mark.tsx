import { LogoSvg } from "@/components/svg/logo-svg";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export function AppLogoMark({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] shadow-sm",
        className,
      )}
      {...props}
    >
      <LogoSvg size={32} />
    </span>
  );
}
