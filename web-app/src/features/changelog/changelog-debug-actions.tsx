import { useDebugPanelAction } from "@/features/debug";
import { useCallback } from "react";
import { resetDismissedChangelogs } from "./changelog-sidebar-stack";

export function ChangelogDebugActions() {
  const handleResetChangelog = useCallback(() => {
    resetDismissedChangelogs();
  }, []);

  useDebugPanelAction({
    id: "reset-changelog",
    label: "Reset Changelog",
    onClick: handleResetChangelog,
  });

  return null;
}
