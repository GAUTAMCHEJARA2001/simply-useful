import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./api/interceptors";

console.log('🚀 Application Bootloader Starting...');
createRoot(document.getElementById("root")!).render(<App />);
