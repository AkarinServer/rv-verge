import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import ForkRightRoundedIcon from "@mui/icons-material/ForkRightRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import { createBrowserRouter, RouteObject } from "react-router";

import Layout from "./_layout";
import HomePage from "./home";
import ProfilesPage from "./profiles";
// 占位符页面
import ProxiesPage from "./proxies";
import ConnectionsPage from "./connections";
import RulesPage from "./rules";
import LogsPage from "./logs";
import UnlockPage from "./unlock";
import SettingsPage from "./settings";

export const navItems = [
  {
    label: "layout.components.navigation.tabs.home",
    path: "/",
    icon: <HomeRoundedIcon />,
    Component: HomePage,
  },
  {
    label: "layout.components.navigation.tabs.proxies",
    path: "/proxies",
    icon: <WifiRoundedIcon />,
    Component: ProxiesPage,
  },
  {
    label: "layout.components.navigation.tabs.profiles",
    path: "/profiles",
    icon: <DnsRoundedIcon />,
    Component: ProfilesPage,
  },
  {
    label: "layout.components.navigation.tabs.connections",
    path: "/connections",
    icon: <LanguageRoundedIcon />,
    Component: ConnectionsPage,
  },
  {
    label: "layout.components.navigation.tabs.rules",
    path: "/rules",
    icon: <ForkRightRoundedIcon />,
    Component: RulesPage,
  },
  {
    label: "layout.components.navigation.tabs.logs",
    path: "/logs",
    icon: <SubjectRoundedIcon />,
    Component: LogsPage,
  },
  {
    label: "layout.components.navigation.tabs.unlock",
    path: "/unlock",
    icon: <LockOpenRoundedIcon />,
    Component: UnlockPage,
  },
  {
    label: "layout.components.navigation.tabs.settings",
    path: "/settings",
    icon: <SettingsRoundedIcon />,
    Component: SettingsPage,
  },
];

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: navItems.map(
      (item) =>
        ({
          path: item.path,
          Component: item.Component,
        }) as RouteObject,
    ),
  },
]);
