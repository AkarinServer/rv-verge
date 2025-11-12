import { createBrowserRouter } from "react-router";

import Layout from "./_layout";
import HomePage from "./home";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomePage,
      },
    ],
  },
]);

