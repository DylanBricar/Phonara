import React from "react";
import { ArrowDown, ArrowUp, RefreshCw, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { useMicrophones } from "../../hooks/useMicrophones";
import {
  findPreferredDevice,
  moveMicrophonePreference,
  resolveMicrophonePriority,
} from "../../lib/microphonePreferences";
import type { MicrophonePreference } from "@/bindings";

interface MicrophoneSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const actionClass =
  "rounded-md p-1.5 hover:bg-logo-primary/10 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-logo-primary";

export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, isLoading } = useSettings();
    const {
      status,
      loading,
      refreshing,
      saving,
      error,
      observationError,
      refresh,
      savePriority,
    } = useMicrophones();
    const priority = getSetting("microphone_priority") ?? [];
    const devices = status?.devices ?? [];
    const busy = saving || isLoading;
    const available = devices.filter(
      (device) =>
        !priority.some(
          (preference) =>
            findPreferredDevice(preference, devices)?.id === device.id,
        ),
    );
    const deferred =
      status?.is_recording && status.active?.id !== status.next?.id;

    const save = async (next: MicrophonePreference[]) => {
      const resolved = resolveMicrophonePriority(next, devices);
      if (!(await savePriority(resolved))) {
        toast.error(t("settings.sound.microphone.priority.saveError"));
      }
    };

    return (
      <SettingContainer
        title={t("settings.sound.microphone.priority.title")}
        description={t("settings.sound.microphone.priority.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        layout="stacked"
      >
        <div className="space-y-3" data-testid="microphone-priority">
          <p className="text-xs text-mid-gray">
            {t("settings.sound.microphone.priority.hint")}
          </p>
          <div
            className="rounded-md bg-logo-primary/5 px-3 py-2 text-sm space-y-1"
            role="status"
            aria-live="polite"
          >
            {status?.active && (
              <p>
                {t("settings.sound.microphone.priority.active", {
                  name: status.active.name,
                })}
              </p>
            )}
            <p>
              {loading
                ? t("settings.sound.microphone.loading")
                : status?.next
                  ? t("settings.sound.microphone.priority.next", {
                      name: status.next.name,
                    })
                  : t("settings.sound.microphone.priority.noDevice")}
              {status?.next?.is_default && (
                <span className="ms-2 text-xs text-mid-gray">
                  {t("settings.sound.microphone.priority.systemDefault")}
                </span>
              )}
            </p>
            {deferred && (
              <p className="text-xs text-mid-gray">
                {t("settings.sound.microphone.priority.deferred")}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {t("settings.sound.microphone.priority.refreshError")}
            </p>
          )}
          {!error && status?.error && (
            <p role="alert" className="text-sm text-red-500">
              {t("settings.sound.microphone.priority.deviceError")}
            </p>
          )}
          {observationError && (
            <p role="alert" className="text-sm text-red-500">
              {t("settings.sound.microphone.priority.observationError")}
            </p>
          )}
          {priority.length > 0 ? (
            <ol
              className="divide-y divide-mid-gray/10 rounded-md border border-mid-gray/20"
              aria-label={t("settings.sound.microphone.priority.list")}
            >
              {priority.map((preference, index) => {
                const device = findPreferredDevice(preference, devices);
                const name = device?.name ?? preference.name;
                const duplicateName =
                  devices.filter((item) => item.name === name).length > 1 ||
                  priority.filter((item) => item.name === name).length > 1;
                return (
                  <li
                    key={preference.id ?? `legacy:${preference.name}`}
                    className="flex items-center gap-2 px-3 py-2"
                    data-microphone-id={preference.id ?? preference.name}
                  >
                    <span
                      className="text-sm tabular-nums text-mid-gray"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{name}</p>
                      <p className="text-xs text-mid-gray">
                        {device
                          ? t("settings.sound.microphone.priority.connected")
                          : t(
                              "settings.sound.microphone.priority.disconnected",
                            )}
                        {device?.is_default && (
                          <span className="ms-2">
                            {t(
                              "settings.sound.microphone.priority.systemDefault",
                            )}
                          </span>
                        )}
                      </p>
                      {duplicateName && preference.id && (
                        <p className="text-xs text-mid-gray break-all">
                          {preference.id}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        className={actionClass}
                        aria-label={t(
                          "settings.sound.microphone.priority.moveUp",
                          { name },
                        )}
                        disabled={busy || index === 0}
                        onClick={() =>
                          void save(
                            moveMicrophonePreference(priority, index, -1),
                          )
                        }
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={actionClass}
                        aria-label={t(
                          "settings.sound.microphone.priority.moveDown",
                          { name },
                        )}
                        disabled={busy || index === priority.length - 1}
                        onClick={() =>
                          void save(
                            moveMicrophonePreference(priority, index, 1),
                          )
                        }
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={actionClass}
                        aria-label={t(
                          "settings.sound.microphone.priority.remove",
                          { name },
                        )}
                        disabled={busy}
                        onClick={() =>
                          void save(
                            priority.filter(
                              (_, position) => position !== index,
                            ),
                          )
                        }
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm">
              {t("settings.sound.microphone.priority.followDefault")}
            </p>
          )}
          {priority.length > 0 && (
            <p className="text-xs text-mid-gray">
              {t("settings.sound.microphone.priority.fallback")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-w-0 flex-1 rounded-md border border-mid-gray/50 bg-background p-2 text-sm disabled:opacity-50"
              aria-label={t("settings.sound.microphone.priority.add")}
              value=""
              disabled={busy || loading || available.length === 0}
              onChange={(event) => {
                const device = available.find(
                  (item) => item.id === event.target.value,
                );
                if (device)
                  void save([
                    ...priority,
                    { id: device.id, name: device.name },
                  ]);
              }}
            >
              <option value="">
                {t(
                  available.length === 0
                    ? "settings.sound.microphone.priority.allAdded"
                    : "settings.sound.microphone.priority.add",
                )}
              </option>
              {available.map((device) => (
                <option key={device.id} value={device.id}>
                  {devices.filter((item) => item.name === device.name).length >
                  1
                    ? t("settings.sound.microphone.priority.deviceIdentity", {
                        name: device.name,
                        id: device.id,
                      })
                    : device.name}
                  {device.is_default
                    ? t("settings.sound.microphone.priority.defaultSuffix")
                    : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={actionClass}
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label={t("settings.sound.microphone.priority.refresh")}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={`${actionClass} inline-flex items-center gap-1 text-xs`}
              onClick={() => void save([])}
              disabled={busy || priority.length === 0}
            >
              <RotateCcw size={14} aria-hidden="true" />
              {t("settings.sound.microphone.priority.reset")}
            </button>
          </div>
        </div>
      </SettingContainer>
    );
  },
);

MicrophoneSelector.displayName = "MicrophoneSelector";
