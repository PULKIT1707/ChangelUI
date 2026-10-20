// Copies src/styles/theme.css and themes.css (the opt-in presets) to dist byte for byte (design 5.11 Mode 1).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "dist"), { recursive: true });
for (const file of ["theme.css", "themes.css"]) copyFileSync(join(root, "src/styles", file), join(root, "dist", file));
console.log("copy-theme: dist/theme.css and dist/themes.css written");
