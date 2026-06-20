import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = { env: {} };

  // Intercept and suppress browser extension connection errors in the console
  const isExtensionConnectionError = (error: any): boolean => {
    if (!error) return false;
    const msg = error.message || (typeof error === "string" ? error : "");
    return typeof msg === "string" && msg.includes("Could not establish connection. Receiving end does not exist.");
  };

  window.addEventListener("unhandledrejection", (event) => {
    if (isExtensionConnectionError(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    if (isExtensionConnectionError(event.error) || isExtensionConnectionError(event.message)) {
      event.preventDefault();
    }
  }, true);
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./api/interceptors";

console.log('🚀 Application Bootloader Starting...');
createRoot(document.getElementById("root")!).render(<App />);
