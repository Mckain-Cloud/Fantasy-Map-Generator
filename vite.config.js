import {defineConfig} from "vite";
import apiPlugin from "./vite-plugins/api.js";

export default defineConfig({
  plugins: [apiPlugin()],
  root: "./",
  server: {
    port: 8080,
    open: true
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html"
    }
  },
  // Don't try to optimize vendored libraries
  optimizeDeps: {
    exclude: ["./libs/d3.min.js", "./libs/jquery-3.1.1.min.js", "./libs/three.min.js"]
  }
});
