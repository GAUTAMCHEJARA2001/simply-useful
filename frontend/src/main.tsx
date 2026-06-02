import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = { env: {} };
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./api/interceptors";

console.log('🚀 Application Bootloader Starting...');
createRoot(document.getElementById("root")!).render(<App />);
