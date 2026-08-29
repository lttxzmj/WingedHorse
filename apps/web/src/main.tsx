import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@wingedhorse/ui/styles.css";
import "./styles.css";
import "./refined-ui.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD && window.isSecureContext) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Online use remains available if the browser rejects service worker registration.
    });
  });
}
