import {
  RefreshOutlined,
  RouterOutlined,
  InfoOutlined,
  ShowChartOutlined,
} from "@mui/icons-material";
import { Box, Grid, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useRef } from "react";

import { BasePage } from "@/components/base";
import { ClashModeCard } from "@/components/home/clash-mode-card";
import { EnhancedCard } from "@/components/home/enhanced-card";
import { SystemInfoCard } from "@/components/home/system-info-card";
import { EnhancedCanvasTrafficGraph } from "@/components/home/enhanced-canvas-traffic-graph";
import { EnhancedTrafficStats } from "@/components/home/enhanced-traffic-stats";
import { IpInfoCard, type IpInfoCardRef } from "@/components/home/ip-info-card";
import { HomeProfileCard } from "@/components/home/home-profile-card";
import { useTrafficData } from "@/hooks/use-traffic-data";

const HomePage = () => {
  const { t, ready } = useTranslation();
  const { trafficRef } = useTrafficData();
  const ipInfoRefreshRef = useRef<IpInfoCardRef>(null);

  // Show loading state if i18n is not ready
  if (!ready) {
    return (
      <BasePage title={t("shared.messages.loading")} contentStyle={{ padding: 2 }}>
        <div>{t("shared.messages.loading")}</div>
      </BasePage>
    );
  }

  return (
    <BasePage 
      showHeader={false}
      contentStyle={{ 
        padding: 2,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: "fit-content",
        }}
      >
        <Grid 
          container 
          spacing={1.5} 
          columns={{ xs: 6, sm: 6, md: 12 }}
          sx={{
            width: "100%",
            margin: 0,
            /* 确保 Grid 内容自适应 */
            "& .MuiGrid-item": {
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
        <Grid size={6}>
          <EnhancedCard
            title={t("home.page.cards.proxyMode")}
            icon={<RouterOutlined />}
            iconColor="info"
            action={
              <IconButton
                size="small"
                onClick={() => ipInfoRefreshRef.current?.refresh()}
                title={t("home.components.ipInfo.title")}
              >
                <RefreshOutlined fontSize="small" />
              </IconButton>
            }
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                gap: 1.5,
              }}
            >
              {/* Proxy Mode - 占据 60% 高度 */}
              <Box
                sx={{
                  flex: "0 0 60%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <ClashModeCard />
              </Box>

              {/* IP Info - 占据 40% 高度 */}
              <Box
                sx={{
                  flex: "0 0 40%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  pt: 1.5,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <IpInfoCard ref={ipInfoRefreshRef} />
              </Box>
            </Box>
          </EnhancedCard>
        </Grid>

        <Grid size={6}>
          <EnhancedCard
            title={t("home.components.trafficGraph.title")}
            icon={<ShowChartOutlined />}
            iconColor="success"
            minHeight={200}
          >
            <Box sx={{ height: 150, position: "relative" }}>
              <EnhancedCanvasTrafficGraph ref={trafficRef} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <EnhancedTrafficStats />
            </Box>
          </EnhancedCard>
        </Grid>

        <Grid size={6}>
          <EnhancedCard
            title={t("home.components.systemInfo.title")}
            icon={<InfoOutlined />}
            iconColor="secondary"
          >
            <SystemInfoCard />
          </EnhancedCard>
        </Grid>

        <Grid size={6}>
          <HomeProfileCard />
        </Grid>
      </Grid>
      </Box>
    </BasePage>
  );
};

export default HomePage;
