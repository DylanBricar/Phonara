import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import {
  commands,
  type MicrophonePreference,
  type MicrophoneStatus,
} from "@/bindings";
import { useSettingsStore } from "./settingsStore";

interface MicrophoneStore {
  status: MicrophoneStatus | null;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  error: boolean;
  observationError: boolean;
  refresh: () => Promise<void>;
  savePriority: (priority: MicrophonePreference[]) => Promise<boolean>;
}

let consumers = 0;
let generation = 0;
let stopListening: (() => void) | undefined;
let refreshInFlight: Promise<void> | null = null;

function acceptStatus(status: MicrophoneStatus, currentGeneration: number) {
  if (currentGeneration !== generation) return;
  useMicrophoneStore.setState((state) => {
    if (state.status && status.revision < state.status.revision) return state;
    return { status, loading: false, error: false };
  });
}

export const useMicrophoneStore = create<MicrophoneStore>((set, get) => ({
  status: null,
  loading: true,
  refreshing: false,
  saving: false,
  error: false,
  observationError: false,
  refresh: () => {
    if (refreshInFlight) return refreshInFlight;
    const currentGeneration = generation;
    set({ refreshing: true });
    refreshInFlight = (async () => {
      try {
        const result = await commands.refreshMicrophoneDevices();
        if (result.status === "error") throw new Error(result.error);
        acceptStatus(result.data, currentGeneration);
      } catch (error) {
        if (currentGeneration === generation) {
          console.error("Failed to refresh microphones:", error);
          set({ error: true, loading: false });
        }
      } finally {
        if (currentGeneration === generation) {
          set({ refreshing: false });
          refreshInFlight = null;
        }
      }
    })();
    return refreshInFlight;
  },
  savePriority: async (priority) => {
    if (get().saving) return false;
    set({ saving: true });
    try {
      const result = await commands.setMicrophonePriority(priority);
      if (result.status === "error") throw new Error(result.error);
      const priorityBeforeRead =
        useSettingsStore.getState().settings?.microphone_priority;
      let persistedPriority = priority;
      try {
        const settings = await commands.getAppSettings();
        if (settings.status === "error") throw new Error(settings.error);
        persistedPriority = settings.data.microphone_priority ?? priority;
      } catch (error) {
        // Persistence already succeeded. Retain the submitted order if the
        // follow-up read fails; a later settings event can resolve legacy IDs.
        console.error("Failed to read saved microphone priorities:", error);
      }
      // Keep the last confirmed order visible on failure. Update just this key
      // so a concurrent change to another setting is never overwritten.
      useSettingsStore.setState((state) => {
        // A newer backend event may arrive during the read (for example when
        // a legacy device is identified). Do not overwrite that event.
        if (state.settings?.microphone_priority !== priorityBeforeRead)
          return state;
        return {
          settings: state.settings
            ? { ...state.settings, microphone_priority: persistedPriority }
            : null,
        };
      });
      return true;
    } catch (error) {
      console.error("Failed to save microphone priority:", error);
      return false;
    } finally {
      set({ saving: false });
    }
  },
}));

/** Share one listener between the priority editor and the channel selector. */
export function connectMicrophoneStatus(): () => void {
  consumers += 1;
  if (consumers === 1) {
    const currentGeneration = ++generation;
    useMicrophoneStore.setState({ observationError: false });
    void (async () => {
      try {
        const unlisten = await listen<MicrophoneStatus>(
          "microphone-status-changed",
          (event) => acceptStatus(event.payload, currentGeneration),
        );
        if (currentGeneration !== generation) {
          unlisten();
          return;
        }
        stopListening = unlisten;
        const snapshot = await commands.getMicrophoneStatus();
        if (snapshot.status === "error") throw new Error(snapshot.error);
        acceptStatus(snapshot.data, currentGeneration);
      } catch (error) {
        if (currentGeneration === generation) {
          console.error("Failed to observe microphones:", error);
          useMicrophoneStore.setState({
            error: true,
            observationError: !stopListening,
            loading: false,
          });
        }
      }
      if (currentGeneration === generation) {
        await useMicrophoneStore.getState().refresh();
      }
    })();
  }
  let disconnected = false;
  return () => {
    if (disconnected) return;
    disconnected = true;
    consumers -= 1;
    if (consumers === 0) {
      generation += 1;
      stopListening?.();
      stopListening = undefined;
      refreshInFlight = null;
      useMicrophoneStore.setState({ refreshing: false });
    }
  };
}
