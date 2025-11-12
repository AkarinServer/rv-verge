import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import reactSwc from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect architecture - use Babel-based React plugin for RISC-V, SWC for others
// SWC doesn't have native bindings for RISC-V, so we must use Babel-based plugin
const isRiscV = 
  process.env.TARGET_ARCH === "riscv64" ||
  process.env.RUNNER_ARCH === "riscv64" ||
  process.arch === "riscv64" ||
  os.arch() === "riscv64";

// Use Babel-based React plugin for RISC-V (SWC doesn't support RISC-V)
// Use SWC-based React plugin for other architectures (faster)
const reactPlugin = isRiscV ? react() : reactSwc();

if (isRiscV) {
  console.log("[vite.config.ts] Detected RISC-V architecture, using Babel-based React plugin (@vitejs/plugin-react)");
  console.log(`[vite.config.ts] TARGET_ARCH: ${process.env.TARGET_ARCH}, RUNNER_ARCH: ${process.env.RUNNER_ARCH}, process.arch: ${process.arch}, os.arch(): ${os.arch()}`);
} else {
  console.log(`[vite.config.ts] Using SWC-based React plugin (@vitejs/plugin-react-swc) - arch: ${process.arch || os.arch()}`);
}

export default defineConfig({
  root: "src",
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**", "**/clash-verge-rev/**"],
    },
  },
  plugins: [
    svgr(),
    reactPlugin,
    legacy({
      targets: ["edge>=109", "safari>=13"],
      renderLegacyChunks: false,
      modernPolyfills: true,
      additionalModernPolyfills: [
        path.resolve(__dirname, "src/polyfills/matchMedia.js"),
        path.resolve(__dirname, "src/polyfills/WeakRef.js"),
        path.resolve(__dirname, "src/polyfills/RegExp.js"),
      ],
    }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false,
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      treeshake: {
        preset: "recommended",
        moduleSideEffects: (id) => !id.endsWith(".css"),
        tryCatchDeoptimization: false,
      },
      output: {
        compact: true,
        experimentalMinChunkSize: 50000,
        dynamicImportInCjs: true,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core libraries
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            ) {
              return "react-core";
            }

            // Material UI libraries (grouped together)
            if (
              id.includes("@mui/material") ||
              id.includes("@mui/icons-material")
            ) {
              return "mui";
            }

            // Tauri-related plugins
            if (
              id.includes("@tauri-apps/api") ||
              id.includes("@tauri-apps/plugin")
            ) {
              return "tauri-plugins";
            }

            // Utilities chunk
            if (
              id.includes("axios") ||
              id.includes("lodash-es") ||
              id.includes("dayjs") ||
              id.includes("js-yaml") ||
              id.includes("nanoid")
            ) {
              return "utils";
            }

            // Group all other packages together
            return "vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      // When root is "src", Vite's working directory is "src"
      // So "@" should point to the src directory (current working directory in Vite)
      "@": path.resolve(__dirname, "src"),
      "@root": path.resolve(__dirname),
    },
  },
  define: {
    OS_PLATFORM: `"${process.platform}"`,
  },
});

