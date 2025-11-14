import { Box, Button, ButtonGroup } from "@mui/material";
import { useLockFn } from "ahooks";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { closeAllConnections, getBaseConfig } from "tauri-plugin-mihomo-api";

import { BasePage } from "@/components/base";
import { ProxyGroups } from "@/components/proxy/proxy-groups";
import { useVerge } from "@/hooks/use-verge";
import { patchClashMode } from "@/services/cmds";
import { SWR_DEFAULTS } from "@/services/config";

const MODES = ["rule", "global", "direct"] as const;
type Mode = (typeof MODES)[number];
const MODE_SET = new Set<string>(MODES);
const isMode = (value: unknown): value is Mode =>
  typeof value === "string" && MODE_SET.has(value);

const ProxiesPage = () => {
  const { t } = useTranslation();

  const { data: clashConfig, mutate: mutateClash } = useSWR(
    "getClashConfig",
    getBaseConfig,
    {
      ...SWR_DEFAULTS,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );

  const { verge } = useVerge();

  const modeList = useMemo(() => MODES, []);

  const normalizedMode = clashConfig?.mode?.toLowerCase();
  const curMode = isMode(normalizedMode) ? normalizedMode : undefined;

  const onChangeMode = useLockFn(async (mode: Mode) => {
    // 断开连接
    if (mode !== curMode && verge?.auto_close_connection) {
      closeAllConnections();
    }
    await patchClashMode(mode);
    mutateClash();
  });

  useEffect(() => {
    if (normalizedMode && !isMode(normalizedMode)) {
      onChangeMode("rule");
    }
  }, [normalizedMode, onChangeMode]);

  return (
    <BasePage
      full
      contentStyle={{ height: "100%" }}
      title={t("proxies.page.title")}
      header={
        <Box display="flex" alignItems="center" gap={1}>
          <ButtonGroup size="small">
            {modeList.map((mode) => (
              <Button
                key={mode}
                variant={mode === curMode ? "contained" : "outlined"}
                onClick={() => onChangeMode(mode)}
                sx={{ textTransform: "capitalize" }}
              >
                {t(`proxies.page.modes.${mode}`)}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      }
    >
      <ProxyGroups mode={curMode ?? "rule"} />
    </BasePage>
  );
};

export default ProxiesPage;

