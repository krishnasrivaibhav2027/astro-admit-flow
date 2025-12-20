import { ThemeProvider } from "@/components/theme-provider";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="admitai-theme">
    <App />
  </ThemeProvider>
);
