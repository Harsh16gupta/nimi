import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static showcase site: the trace ships in the bundle (imported ?raw),
// no backend, no env. Deploys from demo/ as root.
export default defineConfig({
  plugins: [react()],
});
