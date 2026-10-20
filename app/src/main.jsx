import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "@ui/styles.css";
import "@ui/docs.css";
import "@ui/document.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
