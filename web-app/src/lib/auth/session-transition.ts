type LocationTarget = Pick<Location, "assign">;

function getLocationTarget() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

export function redirectAfterAuthSessionChange(
  to: string,
  locationTarget: LocationTarget | null = getLocationTarget(),
) {
  locationTarget?.assign(to);
}
