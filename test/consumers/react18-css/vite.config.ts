import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Mode 2: no Tailwind plugin; the app imports changelui/styles.css. Loopback binds only.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
