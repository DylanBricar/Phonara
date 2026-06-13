import { useEffect, useMemo, useRef, useState } from "react";

type AsyncQueryOptions<TData> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<TData> | TData;
  enabled?: boolean;
  initialData?: TData;
};

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function useAsyncQuery<TData>({
  queryKey,
  queryFn,
  enabled = true,
  initialData,
}: AsyncQueryOptions<TData>) {
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const stableKey = useMemo(() => JSON.stringify(queryKey), [queryKey]);
  const [data, setData] = useState<TData | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(
    enabled && initialData === undefined,
  );

  useEffect(() => {
    let active = true;

    if (!enabled) {
      return;
    }

    void Promise.resolve().then(() => {
      if (!active) return;

      setIsLoading(true);
      setError(null);

      Promise.resolve(queryFnRef.current())
        .then((result) => {
          if (active) setData(result);
        })
        .catch((caught) => {
          if (active) setError(toError(caught));
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, [enabled, stableKey]);

  return {
    data,
    error,
    isError: error !== null,
    isLoading: enabled && isLoading,
    isPending: enabled && isLoading,
  };
}
