import { create } from "zustand";

export type DebugAction = {
  id: string;
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "default" | "destructive";
};

export type DebugInfo = {
  id: string;
  label: string;
  value: string | number | boolean | null;
};

type DebugPanelStore = {
  actions: DebugAction[];
  infos: DebugInfo[];
  addAction: (action: DebugAction) => void;
  removeAction: (id: string) => void;
  addInfo: (info: DebugInfo) => void;
  removeInfo: (id: string) => void;
  updateInfo: (id: string, value: DebugInfo["value"]) => void;
};

export const useDebugPanelStore = create<DebugPanelStore>((set) => ({
  actions: [],
  infos: [],
  addAction: (action) =>
    set((state) => ({
      actions: [...state.actions.filter((a) => a.id !== action.id), action],
    })),
  removeAction: (id) =>
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    })),
  addInfo: (info) =>
    set((state) => ({
      infos: [...state.infos.filter((i) => i.id !== info.id), info],
    })),
  removeInfo: (id) =>
    set((state) => ({
      infos: state.infos.filter((i) => i.id !== id),
    })),
  updateInfo: (id, value) =>
    set((state) => ({
      infos: state.infos.map((i) => (i.id === id ? { ...i, value } : i)),
    })),
}));
