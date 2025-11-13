import { useSWRConfig } from "swr";

export const SWR_DEFAULTS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  suspense: false,
  errorRetryCount: 2,
  dedupingInterval: 5000,
} as const;

export const SWR_REALTIME = {
  ...SWR_DEFAULTS,
  refreshInterval: 8000,
  dedupingInterval: 3000,
} as const;

export const SWR_SLOW_POLL = {
  ...SWR_DEFAULTS,
  // 关键修复：从60秒减少到3秒，避免启动时长时间等待
  refreshInterval: 3000,
  // 启动时更宽容的错误处理
  errorRetryCount: 5,
  errorRetryInterval: 1000, // 从2秒减少到1秒，加快重试
  shouldRetryOnError: true,
} as const;

export const useSWRMutate = () => {
  const { mutate } = useSWRConfig();
  return mutate;
};

