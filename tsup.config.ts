import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

export default defineConfig({
  entry: { main: "src/main.tsx" },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: false,
  minify: false,
  splitting: false,
  dts: false,
  banner: { js: "#!/usr/bin/env node" },
  define: { __NIMI_VERSION__: JSON.stringify(pkg.version) },
});
