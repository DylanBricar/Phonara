import { useEffect } from "react";
import {
  connectMicrophoneStatus,
  useMicrophoneStore,
} from "../stores/microphoneStore";

export function useMicrophones() {
  useEffect(connectMicrophoneStatus, []);
  return useMicrophoneStore();
}
