import React from "react";
import { useSettings } from "../../hooks/useSettings";
import { GlobalShortcutInput } from "./GlobalShortcutInput";
import { PhonaraKeysShortcutInput } from "./PhonaraKeysShortcutInput";

interface ShortcutInputProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  shortcutId: string;
  disabled?: boolean;
}

export const ShortcutInput: React.FC<ShortcutInputProps> = (props) => {
  const { getSetting } = useSettings();
  const keyboardImplementation = getSetting("keyboard_implementation");

  if (keyboardImplementation === "phonara_keys") {
    return <PhonaraKeysShortcutInput {...props} />;
  }

  return <GlobalShortcutInput {...props} />;
};
