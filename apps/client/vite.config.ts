import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { version } from "./package.json";
import { short as gitShort } from "git-rev";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig(async ({ mode }) => {
  const isProduction = mode === "production";
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

  // Load CLIENT_* environment variables.
  const env = loadEnv(mode, path.join(currentDirectory, "../.."), "CLIENT_");

  // Generate the version number for the app.
  const commitHash: string = await new Promise(gitShort);
  const appVersion = `${version}+${commitHash}`;

  // This is the config that will be injected into the HTML template.
  const appConfig = {
    name: "Crafts",
    version: appVersion,
    description: "A browser-based game experiment",
    theme_color: "#000000",
    platform: env.CLIENT_PLATFORM || "browser",
  };

  // Rollout options shared between the html and the worker builds
  const rollupOptions = {
    output: {
      assetFileNames: "assets/[hash].[ext]",
      chunkFileNames: "assets/[hash].js",
      entryFileNames: "assets/[hash].js",
    },
  } as const;

  return {
    base: "",
    define: {
      __APP_NAME__: JSON.stringify(appConfig.name),
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_PLATFORM__: JSON.stringify(appConfig.platform),
    },
    plugins: [
      createHtmlPlugin({
        entry: "src/main.ts",
        inject: { data: appConfig },
        minify: isProduction && {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          keepClosingSlash: false,
        },
      }),
    ],
    esbuild: {
      pure: ["console.log", "console.info", "console.debug"],
    },
    build: {
      rollupOptions,
      outDir: "www",
    },
    worker: {
      rollupOptions,
    },
    css: {
      modules: {
        generateScopedName: isProduction
          ? "[hash:base64:7]"
          : "[name]__[local]",
      },
    },
    assetsInclude: ["**/*.gltf", "**/*.glb", "**/*.bin"],
    test: {
      globals: true,
      coverage: {
        provider: "istanbul",
        reporter: ["lcov", "text"],
      },
    },
  };
});
