import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { ReactNode } from "react";

import { BaseErrorBoundary } from "./base-error-boundary";

interface Props {
  title?: React.ReactNode;
  header?: React.ReactNode;
  contentStyle?: React.CSSProperties;
  children?: ReactNode;
  full?: boolean;
  showHeader?: boolean; // 控制是否显示顶栏
}

export const BasePage: React.FC<Props> = (props) => {
  const { title, header, contentStyle, full, children, showHeader = false } = props;
  const theme = useTheme();

  const isDark = theme.palette.mode === "dark";

  return (
    <BaseErrorBoundary>
      <div className="base-page">
        {showHeader && (
          <header data-tauri-drag-region="true" style={{ userSelect: "none" }}>
            <Typography
              sx={{ fontSize: "20px", fontWeight: "700" }}
              data-tauri-drag-region="true"
            >
              {title}
            </Typography>

            {header}
          </header>
        )}

        <div
          className={full ? "base-container no-padding" : "base-container"}
          style={{ backgroundColor: isDark ? "#1e1f27" : "#ffffff" }}
        >
          <section
            style={{
              backgroundColor: isDark ? "#1e1f27" : "var(--background-color)",
            }}
          >
            <div 
              className="base-content" 
              style={{
                ...contentStyle,
                /* 确保 overflow 设置不被覆盖 */
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {children}
            </div>
          </section>
        </div>
      </div>
    </BaseErrorBoundary>
  );
};

