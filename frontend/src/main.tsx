import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop.tsx";
import "./index.scss";
import App from "./App.tsx";

const rootElement = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

if (rootElement.dataset.prerenderedPath === currentPath) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
