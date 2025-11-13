import {
  alpha,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import type { ReactNode } from "react";
import { useMatch, useResolvedPath, useNavigate } from "react-router";

interface Props {
  to: string;
  children: string;
  icon: ReactNode;
}

export const LayoutItem = (props: Props) => {
  const { to, children, icon } = props;
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });
  const navigate = useNavigate();

  return (
    <ListItem
      sx={[
        { py: 0.5, maxWidth: 250, mx: "auto", padding: "4px 0px" },
      ]}
    >
      <ListItemButton
        selected={!!match}
        sx={[
          {
            borderRadius: 2,
            marginLeft: 1.25,
            paddingLeft: 1,
            paddingRight: 1,
            marginRight: 1.25,
            cursor: "pointer",
            "& .MuiListItemText-primary": {
              color: "text.primary",
              fontWeight: "700",
            },
          },
          ({ palette: { mode, primary } }) => {
            const bgcolor =
              mode === "light"
                ? alpha(primary.main, 0.15)
                : alpha(primary.main, 0.35);
            const color = mode === "light" ? "#1f1f1f" : "#ffffff";

            return {
              "&.Mui-selected": { bgcolor },
              "&.Mui-selected:hover": { bgcolor },
              "&.Mui-selected .MuiListItemText-primary": { color },
            };
          },
        ]}
        onClick={() => navigate(to)}
      >
        <ListItemIcon sx={{ color: "text.primary", marginLeft: "6px", minWidth: 36 }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          sx={{
            textAlign: "center",
            marginLeft: "-35px",
          }}
          primary={children}
        />
      </ListItemButton>
    </ListItem>
  );
};

