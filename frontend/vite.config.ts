import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'build'
  },

  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify('http://localhost:8001'),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8001'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
