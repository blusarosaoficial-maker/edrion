import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureUtms } from "./utils/hotmartUtm";

// Persist UTMs from landing URL before SPA navigation loses them
captureUtms();

// Quando um deploy substitui os chunks JS, usuarios com a versao antiga
// recebem erro ao tentar carregar modulos que nao existem mais.
// Detecta isso e faz reload automatico (1x apenas para evitar loop).
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const lastReload = sessionStorage.getItem("chunk-reload");
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10_000) {
    sessionStorage.setItem("chunk-reload", String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
