import React from "react";
import { AppProvider } from "./app/providers";
import { AppRouter } from "./app/router";
import "./index.css";

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
