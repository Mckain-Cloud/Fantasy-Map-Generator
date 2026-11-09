import {defineConfig} from "vite";
import {existsSync, readdirSync} from "fs";
import {viteStaticCopy} from "vite-plugin-static-copy";
import apiPlugin from "./vite-plugins/api.js";

export default defineConfig({
  plugins: [
    apiPlugin(),
    viteStaticCopy({
      targets: [
        // TinyMCE assets. vite-plugin-static-copy v4 keeps the full source path
        // under dest, so strip the "node_modules/tinymce" prefix to get dist/tinymce/skins/...
        {src: "node_modules/tinymce/skins", dest: "tinymce", rename: {stripBase: 2}},
        {src: "node_modules/tinymce/themes", dest: "tinymce", rename: {stripBase: 2}},
        {src: "node_modules/tinymce/plugins", dest: "tinymce", rename: {stripBase: 2}},
        {src: "node_modules/tinymce/icons", dest: "tinymce", rename: {stripBase: 2}},
        {src: "node_modules/tinymce/models", dest: "tinymce", rename: {stripBase: 2}},
        // App static assets (fetched at runtime)
        {src: "styles", dest: "."},
        {src: "config", dest: "."},
        {src: "heightmaps", dest: "."},
        {src: "images", dest: "."},
        {src: "charges", dest: "."},
        {src: "components", dest: "."},
        // vite-plugin-static-copy v4 fails the build on an empty source
        ...(existsSync("saved-maps") && readdirSync("saved-maps").length ? [{src: "saved-maps", dest: "."}] : []),
        // AI modules (for E2E testing) -> dist/modules/ai (v4 preserves the source path)
        {src: "modules/ai", dest: "."}
      ]
    })
  ],
  root: "./",
  server: {
    port: 8080,
    open: true
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: "index.html",
      output: {
        // Vite 8 (rolldown) requires the function form
        manualChunks(id) {
          if (id.includes("node_modules/d3")) return "d3";
          if (id.includes("node_modules/jszip")) return "jszip";
          return undefined;
        }
      }
    }
  }
});
