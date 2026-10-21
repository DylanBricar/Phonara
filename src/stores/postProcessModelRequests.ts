import type { AppSettings } from "@/bindings";

type ModelListConnection = readonly [
  baseUrl: string,
  apiKey: string,
  modelsEndpoint: string | null,
];

// Compare only discovery inputs. Language, selected/custom models and labels do
// not change a connection. Credentials stay in memory and are never logged.
export function modelListConnection(
  settings: AppSettings | null,
  providerId: string,
): ModelListConnection | undefined {
  const provider = settings?.post_process_providers?.find(
    (candidate) => candidate.id === providerId,
  );
  return provider
    ? [
        provider.base_url,
        settings?.post_process_api_keys?.[providerId] ?? "",
        provider.models_endpoint ?? null,
      ]
    : undefined;
}

export function sameModelListConnection(
  previous: ModelListConnection | undefined,
  current: ModelListConnection | undefined,
): boolean {
  return (
    previous === current ||
    (!!previous &&
      !!current &&
      previous.every((value, index) => value === current[index]))
  );
}

/** Own requests per provider and defer discovery until connection edits settle. */
export class PostProcessModelRequests {
  private requests = new Map<string, { token: symbol; started: boolean }>();
  private edits = new Map<
    string,
    { count: number; settled: Promise<void>; resolve: () => void }
  >();

  start(providerId: string): symbol {
    const token = Symbol();
    this.requests.set(providerId, { token, started: false });
    return token;
  }

  invalidate(providerId: string): void {
    // A queued refresh has not captured its connection yet. Preserve the click
    // and let it discover the latest connection after all pending saves finish.
    if (this.requests.get(providerId)?.started)
      this.requests.delete(providerId);
  }

  hasCurrent(providerId: string): boolean {
    return this.requests.has(providerId);
  }

  pendingEdit(providerId: string): Promise<void> | undefined {
    return this.edits.get(providerId)?.settled;
  }

  markStarted(providerId: string, token: symbol): void {
    const request = this.requests.get(providerId);
    if (request?.token === token) request.started = true;
  }

  isCurrent(providerId: string, token: symbol): boolean {
    return this.requests.get(providerId)?.token === token;
  }

  finish(providerId: string, token: symbol): boolean {
    if (!this.isCurrent(providerId, token)) return false;
    this.requests.delete(providerId);
    return true;
  }

  beginEdit(providerId: string): () => void {
    this.invalidate(providerId);
    let edit = this.edits.get(providerId);
    if (!edit) {
      let resolve!: () => void;
      const settled = new Promise<void>((complete) => {
        resolve = complete;
      });
      edit = { count: 0, settled, resolve };
      this.edits.set(providerId, edit);
    }
    edit.count++;
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      if (--edit.count === 0) {
        this.edits.delete(providerId);
        edit.resolve();
      }
    };
  }
}
