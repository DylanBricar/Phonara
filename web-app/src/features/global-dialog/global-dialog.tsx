import { lazy, Suspense } from "react";
import type { DialogType } from "./global-dialog.store";
import { useGlobalDialogStore } from "./global-dialog.store";

const OrgDialogPlan = lazy(async () =>
  import("./org-plan-dialog").then((mod) => ({
    default: mod.OrgPlanDialog,
  })),
);

const DialogTypeMap: Record<DialogType, React.ComponentType> = {
  "org-plan": OrgDialogPlan,
};

export const GlobalDialog = () => {
  const dialogType = useGlobalDialogStore((state) => state.openDialog);

  if (!dialogType) {
    return null;
  }

  const DialogComponent = DialogTypeMap[dialogType];

  return (
    <Suspense fallback={null}>
      <DialogComponent />
    </Suspense>
  );
};
