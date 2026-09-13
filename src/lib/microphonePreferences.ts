import type { MicrophoneDevice, MicrophonePreference } from "@/bindings";

export function isMicrophonePriority(
  value: unknown,
): value is MicrophonePreference[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        (entry.id === null || typeof entry.id === "string") &&
        "name" in entry &&
        typeof entry.name === "string",
    )
  );
}

/** Names are a migration fallback only; never guess between identical names. */
export function findPreferredDevice(
  preference: MicrophonePreference,
  devices: MicrophoneDevice[],
): MicrophoneDevice | undefined {
  if (preference.id !== null) {
    return devices.find((device) => device.id === preference.id);
  }
  const matches = devices.filter((device) => device.name === preference.name);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Resolving a legacy name can collide with an existing ID. Keep its first rank. */
export function resolveMicrophonePriority(
  priority: MicrophonePreference[],
  devices: MicrophoneDevice[],
): MicrophonePreference[] {
  const seen = new Set<string>();
  return priority.flatMap((preference) => {
    const device = findPreferredDevice(preference, devices);
    const resolved = device ? { id: device.id, name: device.name } : preference;
    const key =
      resolved.id === null ? `name:${resolved.name}` : `id:${resolved.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [resolved];
  });
}

export function moveMicrophonePreference(
  priority: MicrophonePreference[],
  index: number,
  direction: -1 | 1,
): MicrophonePreference[] {
  const target = index + direction;
  if (
    index < 0 ||
    index >= priority.length ||
    target < 0 ||
    target >= priority.length
  ) {
    return priority;
  }
  const next = [...priority];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
