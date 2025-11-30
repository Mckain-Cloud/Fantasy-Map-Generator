import {defineConfig} from "vite";
import {viteStaticCopy} from "vite-plugin-static-copy";
import apiPlugin from "./vite-plugins/api.js";

export default defineConfig({
  plugins: [
    apiPlugin(),
    viteStaticCopy({
      targets: [
        // TinyMCE assets
        {src: "node_modules/tinymce/skins", dest: "tinymce"},
        {src: "node_modules/tinymce/themes", dest: "tinymce"},
        {src: "node_modules/tinymce/plugins", dest: "tinymce"},
        {src: "node_modules/tinymce/icons", dest: "tinymce"},
        {src: "node_modules/tinymce/models", dest: "tinymce"},
        // App static assets (fetched at runtime)
        {src: "styles", dest: "."},
        {src: "config", dest: "."},
        {src: "heightmaps", dest: "."},
        {src: "images", dest: "."},
        {src: "charges", dest: "."},
        {src: "components", dest: "."},
        {src: "saved-maps", dest: "."}
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
        manualChunks: {
          d3: ["d3"],
          jszip: ["jszip"]
        }
      }
    }
  }
});
