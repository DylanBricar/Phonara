import { Footer } from "@/features/layout/footer";
import { ContentHeader } from "@/features/layout/content-header";
import type { PropsWithChildren } from "react";

export function BaseLayout(props: PropsWithChildren) {
  return (
    <div className="relative flex min-h-full flex-col">
      <ContentHeader />
      <div className="min-h-full flex-1">{props.children}</div>
      <Footer />
    </div>
  );
}
