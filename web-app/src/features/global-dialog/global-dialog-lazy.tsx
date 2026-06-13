import { lazy, Suspense } from "react";

const GlobalDialogComponent = lazy(async () =>
  import("./global-dialog").then((mod) => ({
    default: mod.GlobalDialog,
  })),
);

export const GlobalDialogLazy = () => (
  <Suspense fallback={null}>
    <GlobalDialogComponent />
  </Suspense>
);
