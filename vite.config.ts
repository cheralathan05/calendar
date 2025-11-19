// vite.config.ts

// 1. Import the 'path' module from Node.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; 

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  
  // 2. Add the resolve block to configure the alias
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});