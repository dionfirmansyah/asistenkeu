import "./polyfills";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Cegah scroll mouse mengubah nilai input number yang sedang fokus
document.addEventListener(
  "wheel",
  (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.tagName === "INPUT" && (t as HTMLInputElement).type === "number") {
      e.preventDefault();
      (t as HTMLInputElement).blur();
    }
  },
  { passive: false, capture: true },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
