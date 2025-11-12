import { createContextState } from "foxact/create-context-state";
import { useLocalStorage } from "foxact/use-local-storage";

const [ThemeModeProvider, useThemeMode, useSetThemeMode] = createContextState<
  "light" | "dark"
>("light");

const [LoadingCacheProvider, useLoadingCache, useSetLoadingCache] =
  createContextState<Record<string, boolean>>({});

const [UpdateStateProvider, useUpdateState, useSetUpdateState] =
  createContextState<boolean>(false);

export {
  ThemeModeProvider,
  useThemeMode,
  useSetThemeMode,
  LoadingCacheProvider,
  useLoadingCache,
  useSetLoadingCache,
  UpdateStateProvider,
  useUpdateState,
  useSetUpdateState,
};

