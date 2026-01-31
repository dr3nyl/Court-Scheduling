import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: "0.5rem", maxWidth: "420px" },
          error: { iconTheme: { primary: "#dc2626" } },
          success: { iconTheme: { primary: "#16a34a" } },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);
