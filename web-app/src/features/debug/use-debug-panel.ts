import { useEffect } from "react";
import {
  useDebugPanelStore,
  type DebugAction,
  type DebugInfo,
} from "./debug-panel-store";

export function useDebugPanelAction(action: DebugAction) {
  const { id, label, onClick, variant } = action;

  useEffect(() => {
    const store = useDebugPanelStore.getState();
    store.addAction({ id, label, onClick, variant });

    return () => {
      store.removeAction(id);
    };
  }, [id, label, onClick, variant]);
}

export function useDebugPanelInfo(info: DebugInfo) {
  const { id, label, value } = info;

  useEffect(() => {
    const store = useDebugPanelStore.getState();
    store.addInfo({ id, label, value });

    return () => {
      store.removeInfo(id);
    };
  }, [id, label, value]);
}
