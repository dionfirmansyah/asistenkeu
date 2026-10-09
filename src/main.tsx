import "./polyfills";
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
