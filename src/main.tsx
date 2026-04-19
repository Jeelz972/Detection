import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// Import de ton fichier CSS global (où l'on mettra Tailwind)
// Décommente cette ligne une fois que tu auras créé le fichier index.css
// import './styles/index.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
