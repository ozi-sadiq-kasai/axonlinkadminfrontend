import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import NetworkStatus from "./NetworkStatus";
import { registerAppShell } from "./registerAppShell";

registerAppShell();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NetworkStatus />
    <App />
  </StrictMode>,
);
