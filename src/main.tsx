import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./art/ArtApp.tsx";
import { startIntro } from "./art/intro.js";

startIntro();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
