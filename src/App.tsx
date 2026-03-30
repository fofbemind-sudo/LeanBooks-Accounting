import React from "react";
import { AppProvider } from "./app/providers";
import { AppRouter } from "./app/router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import "./index.css";

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRouter />
        <Toaster position="top-right" richColors closeButton />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
