import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { AppSettings } from "../../src/bindings";
import { asRuntimeSettings } from "../../src/stores/runtimeSettings";
import { useSettingsStore } from "../../src/stores/settingsStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const originalState = useSettingsStore.getState();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalConsoleError = console.error;
const store = () => useSettingsStore.getState();
const models = (id = "custom") => store().postProcessModelOptions[id] ?? [];
const fetching = (id = "custom") =>
  store().isUpdatingKey(`post_process_models_fetch:${id}`);

function fixture() {
  const settings: AppSettings = {
    app_language: "en",
    selected_channel: null,
    audio_feedback: true,
    post_process_provider_id: "custom",
    post_process_providers: [
      { id: "custom", label: "Custom", base_url: "https://old.invalid/v1" },
      { id: "openai", label: "Other", base_url: "https://other.invalid/v1" },
    ],
    post_process_api_keys: { custom: "synthetic-key" },
    post_process_models: { custom: "my-custom-model" },
    microphone_priority: [],
  };
  useSettingsStore.setState(originalState, true);
  store().setSettings(asRuntimeSettings(structuredClone(settings)));
  const requests: Array<{
    providerId: string;
    baseUrl: string | undefined;
    response: ReturnType<typeof deferred<string[]>>;
  }> = [];
  const tasks: Promise<unknown>[] = [];
  const gates = new Map<string, ReturnType<typeof deferred<void>>>();
  const allGates: ReturnType<typeof deferred<void>>[] = [];
  const failures = new Map<string, unknown>();
  let cleaningUp = false;
  const track = <T>(task: Promise<T>) => {
    tasks.push(task);
    return task;
  };
  mockIPC(async (command, args) => {
    const payload = args as Record<string, unknown>;
    const providerId = payload?.providerId as string;
    const snapshot =
      command === "get_app_settings" ? structuredClone(settings) : undefined;
    const gate = gates.get(command);
    gates.delete(command);
    if (gate) await gate.promise;
    if (failures.has(command)) {
      const error = failures.get(command);
      failures.delete(command);
      throw error;
    }
    const provider = settings.post_process_providers?.find(
      (candidate) => candidate.id === providerId,
    );
    switch (command) {
      case "fetch_post_process_models": {
        const response = deferred<string[]>();
        requests.push({ providerId, baseUrl: provider?.base_url, response });
        if (cleaningUp) response.resolve([]);
        return response.promise;
      }
      case "get_app_settings":
        return snapshot;
      case "change_post_process_base_url_setting":
        if (!provider) throw "missing provider";
        provider.base_url = payload.baseUrl as string;
        return null;
      case "change_post_process_api_key_setting":
        settings.post_process_api_keys![providerId] = payload.apiKey as string;
        return null;
      case "change_post_process_model_setting":
        settings.post_process_models![providerId] = payload.model as string;
        return null;
      case "set_post_process_provider":
        settings.post_process_provider_id = providerId;
        return null;
      case "set_selected_channel":
        settings.selected_channel = payload.channel as number;
        return null;
      case "change_audio_feedback_setting":
        settings.audio_feedback = payload.enabled as boolean;
        return null;
      default:
        throw new Error(`Unexpected command: ${command}`);
    }
  });
  return {
    settings,
    requests,
    track,
    fetch: (id = "custom") => track(store().fetchPostProcessModels(id)),
    delay(command: string) {
      const gate = deferred<void>();
      gates.set(command, gate);
      allGates.push(gate);
      return gate;
    },
    fail: (command: string, error: unknown) => failures.set(command, error),
    async cleanup() {
      cleaningUp = true;
      allGates.forEach((gate) => gate.resolve());
      requests.forEach((request) => request.response.resolve([]));
      await Promise.allSettled(tasks);
      clearMocks();
    },
  };
}

let f: ReturnType<typeof fixture>;
beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
  });
  console.error = () => {};
  f = fixture();
});
afterEach(async () => {
  await f.cleanup();
  useSettingsStore.setState(originalState, true);
  console.error = originalConsoleError;
});
afterAll(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("post-process model discovery through the real settings store", () => {
  test("a late older response cannot overwrite the latest model list", async () => {
    const older = f.fetch();
    const newer = f.fetch();
    f.requests[1].response.resolve(["current"]);
    expect(await newer).toEqual(["current"]);
    f.requests[0].response.resolve(["obsolete"]);
    expect(await older).toEqual([]);
    expect(models()).toEqual(["current"]);
    expect(store().settings?.post_process_models?.custom).toBe(
      "my-custom-model",
    );
  });

  test.each(["success", "failure"])(
    "an obsolete %s cannot clear another request's loading flag",
    async (outcome) => {
      const older = f.fetch();
      const newer = f.fetch();
      if (outcome === "success") f.requests[0].response.resolve(["obsolete"]);
      else f.requests[0].response.reject("synthetic failure");
      await older;
      expect(fetching()).toBe(true);
      f.requests[1].response.resolve(["current"]);
      await newer;
      expect(fetching()).toBe(false);
    },
  );

  const edits = [
    {
      name: "base URL",
      command: "change_post_process_base_url_setting",
      run: () =>
        store().updatePostProcessBaseUrl("custom", "https://new.invalid/v1"),
    },
    {
      name: "API key",
      command: "change_post_process_api_key_setting",
      run: () => store().updatePostProcessApiKey("custom", "synthetic-new-key"),
    },
    {
      name: "generic URL setter",
      command: "change_post_process_base_url_setting",
      run: () =>
        store().updatePostProcessSetting(
          "base_url",
          "custom",
          "https://new.invalid/v1",
        ),
    },
  ];
  for (const edit of edits) {
    test(`${edit.name} invalidates cached and in-flight models`, async () => {
      store().setPostProcessModelOptions("custom", ["cached"]);
      const pending = f.fetch();
      await f.track(edit.run());
      expect(models()).toEqual([]);
      f.requests[0].response.resolve(["obsolete"]);
      expect(await pending).toEqual([]);
      expect(models()).toEqual([]);
      expect(fetching()).toBe(false);
    });

    test(`refresh clicked during a ${edit.name} save waits for the effective connection`, async () => {
      const gate = f.delay(edit.command);
      const saving = f.track(edit.run());
      const pending = f.fetch();
      expect(f.requests).toHaveLength(0);
      expect(fetching()).toBe(true);
      gate.resolve();
      await saving;
      f.requests[0].response.resolve(["current"]);
      expect(await pending).toEqual(["current"]);
    });
  }

  test("one queued refresh survives overlapping URL and key saves", async () => {
    const urlGate = f.delay("change_post_process_base_url_setting");
    const keyGate = f.delay("change_post_process_api_key_setting");
    const url = f.track(
      store().updatePostProcessBaseUrl("custom", "https://new.invalid/v1"),
    );
    const pending = f.fetch();
    const key = f.track(
      store().updatePostProcessApiKey("custom", "synthetic-new-key"),
    );
    urlGate.resolve();
    await url;
    expect(f.requests).toHaveLength(0);
    keyGate.resolve();
    await key;
    expect(f.requests[0].baseUrl).toBe("https://new.invalid/v1");
    f.requests[0].response.resolve(["current"]);
    expect(await pending).toEqual(["current"]);
  });

  test("only the latest queued refresh executes after the save", async () => {
    const gate = f.delay("change_post_process_base_url_setting");
    const saving = f.track(
      store().updatePostProcessBaseUrl("custom", "https://new.invalid/v1"),
    );
    const older = f.fetch();
    const newer = f.fetch();
    gate.resolve();
    await saving;
    expect(await older).toEqual([]);
    expect(f.requests).toHaveLength(1);
    expect(fetching()).toBe(true);
    f.requests[0].response.resolve(["current"]);
    expect(await newer).toEqual(["current"]);
  });

  test("changing one provider preserves another provider's request", async () => {
    const custom = f.fetch();
    const other = f.fetch("openai");
    await f.track(
      store().updatePostProcessApiKey("custom", "synthetic-new-key"),
    );
    f.requests[0].response.resolve(["obsolete"]);
    expect(await custom).toEqual([]);
    expect(fetching("openai")).toBe(true);
    f.requests[1].response.resolve(["other-model"]);
    expect(await other).toEqual(["other-model"]);
    expect(models("openai")).toEqual(["other-model"]);
  });

  test("switching and reselecting a provider invalidates its previous request", async () => {
    const old = f.fetch();
    await f.track(store().setPostProcessProvider("openai"));
    await f.track(store().setPostProcessProvider("custom"));
    const current = f.fetch();
    f.requests[0].response.resolve(["obsolete"]);
    expect(await old).toEqual([]);
    expect(fetching()).toBe(true);
    f.requests[1].response.resolve(["current"]);
    await current;
    expect(models()).toEqual(["current"]);
  });

  test.each([
    "synthetic provider rejection",
    new Error("synthetic IPC failure"),
  ])(
    "a failed provider switch restores its cached list and previous selection (%s)",
    async (error) => {
      store().setPostProcessModelOptions("custom", ["custom-cached"]);
      store().setPostProcessModelOptions("openai", ["other-cached"]);
      f.fail("set_post_process_provider", error);
      await f.track(store().setPostProcessProvider("openai"));
      expect(store().settings?.post_process_provider_id).toBe("custom");
      expect(models()).toEqual(["custom-cached"]);
      expect(models("openai")).toEqual(["other-cached"]);
      expect(store().isUpdatingKey("post_process_provider_id")).toBe(false);
    },
  );

  test.each(["base_url", "api_key", "models_endpoint"])(
    "a settings refresh changing %s invalidates stale models",
    async (field) => {
      store().setPostProcessModelOptions("custom", ["cached"]);
      const pending = f.fetch();
      if (field === "api_key")
        f.settings.post_process_api_keys!.custom = "synthetic-new-key";
      else if (field === "base_url")
        f.settings.post_process_providers![0].base_url =
          "https://new.invalid/v1";
      else
        f.settings.post_process_providers![0].models_endpoint = "/models/new";
      await f.track(store().refreshSettings());
      expect(models()).toEqual([]);
      f.requests[0].response.resolve(["obsolete"]);
      expect(await pending).toEqual([]);
    },
  );

  test("language, custom model and provider labels preserve current discovery", async () => {
    store().setPostProcessModelOptions("custom", ["cached"]);
    const pending = f.fetch();
    f.settings.app_language = "fr";
    f.settings.post_process_providers![0].label = "Renamed provider";
    await f.track(
      store().updatePostProcessModel("custom", "another-custom-model"),
    );
    expect(models()).toEqual(["cached"]);
    f.requests[0].response.resolve(["current"]);
    expect(await pending).toEqual(["current"]);
    expect(store().settings?.post_process_models?.custom).toBe(
      "another-custom-model",
    );
    expect(store().settings?.app_language).toBe("fr");
  });

  test("a reversed settings response cannot revert the newest connection", async () => {
    const gate = f.delay("get_app_settings");
    const older = f.track(store().refreshSettings());
    f.settings.post_process_providers![0].base_url = "https://new.invalid/v1";
    await f.track(store().refreshSettings());
    gate.resolve();
    await older;
    expect(store().settings?.post_process_providers?.[0].base_url).toBe(
      "https://new.invalid/v1",
    );
  });

  test("a superseded save read-back waits for the latest refresh before discovery", async () => {
    const oldRead = f.delay("get_app_settings");
    const saving = f.track(
      store().updatePostProcessApiKey("custom", "synthetic-new-key"),
    );
    const pending = f.fetch();
    // Let the save enter its first settings read-back, which is held above.
    await Promise.resolve();
    await Promise.resolve();
    const newRead = f.delay("get_app_settings");
    f.settings.post_process_providers![0].base_url = "https://new.invalid/v1";
    const refresh = f.track(store().refreshSettings());
    oldRead.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toHaveLength(0);
    newRead.resolve();
    await refresh;
    await saving;
    expect(f.requests[0].baseUrl).toBe("https://new.invalid/v1");
    f.requests[0].response.resolve(["current"]);
    expect(await pending).toEqual(["current"]);
  });

  test("partial URL success still synchronizes when clearing the model fails", async () => {
    const gate = f.delay("change_post_process_model_setting");
    f.fail("change_post_process_model_setting", "synthetic reset failure");
    const saving = f.track(
      store().updatePostProcessBaseUrl("custom", "https://new.invalid/v1"),
    );
    const pending = f.fetch();
    gate.resolve();
    await saving;
    expect(store().settings?.post_process_providers?.[0].base_url).toBe(
      "https://new.invalid/v1",
    );
    expect(store().settings?.post_process_models?.custom).toBe(
      "my-custom-model",
    );
    expect(f.requests[0].baseUrl).toBe("https://new.invalid/v1");
    f.requests[0].response.resolve(["current"]);
    expect(await pending).toEqual(["current"]);
  });

  test.each(["save rejected", new Error("synthetic IPC failure")])(
    "a failed connection save releases queued refresh (%s)",
    async (error) => {
      const gate = f.delay("change_post_process_base_url_setting");
      f.fail("change_post_process_base_url_setting", error);
      const saving = f.track(
        store().updatePostProcessBaseUrl("custom", "https://new.invalid/v1"),
      );
      const pending = f.fetch();
      gate.resolve();
      await saving;
      expect(f.requests[0].baseUrl).toBe("https://old.invalid/v1");
      f.requests[0].response.resolve(["current"]);
      expect(await pending).toEqual(["current"]);
      expect(fetching()).toBe(false);
    },
  );

  test("clearing settings prevents late responses from restoring lists", async () => {
    const pending = f.fetch();
    store().setSettings(null);
    f.requests[0].response.resolve(["obsolete"]);
    expect(await pending).toEqual([]);
    expect(models()).toEqual([]);
    expect(fetching()).toBe(false);
  });

  test("missing providers do not start a native discovery request", async () => {
    expect(await f.fetch("missing")).toEqual([]);
    expect(f.requests).toHaveLength(0);
    expect(fetching("missing")).toBe(false);
  });

  test("current discovery failure preserves the last valid list and permits retry", async () => {
    store().setPostProcessModelOptions("custom", ["cached"]);
    const failing = f.fetch();
    f.requests[0].response.reject("synthetic failure");
    expect(await failing).toEqual([]);
    expect(models()).toEqual(["cached"]);
    expect(fetching()).toBe(false);
    const retry = f.fetch();
    f.requests[1].response.resolve(["current"]);
    expect(await retry).toEqual(["current"]);
  });
});

describe("existing rollback integration covers Handy #2307", () => {
  test.each([false, true])(
    "a failed setting preserves another edit whether it has completed=%s",
    async (completeOther) => {
      const channelGate = f.delay("set_selected_channel");
      const feedbackGate = f.delay("change_audio_feedback_setting");
      f.fail("set_selected_channel", "synthetic channel failure");
      const channel = f.track(store().updateSetting("selected_channel", 1));
      const feedback = f.track(store().updateSetting("audio_feedback", false));
      if (completeOther) {
        feedbackGate.resolve();
        await feedback;
      }
      channelGate.resolve();
      await channel;
      expect(store().settings?.selected_channel).toBeNull();
      expect(store().settings?.audio_feedback).toBe(false);
      if (!completeOther)
        expect(store().isUpdatingKey("audio_feedback")).toBe(true);
      feedbackGate.resolve();
      await feedback;
      expect(store().isUpdatingKey("selected_channel")).toBe(false);
      expect(store().isUpdatingKey("audio_feedback")).toBe(false);
    },
  );
});
