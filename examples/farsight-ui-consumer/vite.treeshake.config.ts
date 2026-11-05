/**
 * Vite config for the D-05 Button-only tree-shake proof build.
 *
 * Builds only src/treeshake-probe.tsx into dist-treeshake/.
 * The output must contain NO xyflow or recharts chunks.
 *
 * Verified by: `! grep -rEi "xyflow|react-flow|recharts" dist-treeshake/assets/`
 */
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "dist-treeshake",
    rollupOptions: {
      input: {
        treeshake: "treeshake.html",
      },
    },
  },
})
