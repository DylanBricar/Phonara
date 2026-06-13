declare module "nitro/storage" {
  type StorageValue = string | null;

  export function useStorage(base?: string): {
    getKeys: () => Promise<string[]>;
    getItem: (key: string) => Promise<StorageValue>;
  };
}
