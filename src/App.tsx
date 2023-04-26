import * as React from "react";

import AuthIndicator from "./components/AuthIndicator";
import FastAuthController from "./lib/controller";
import { globalStyles } from "./styles/global-styles";

(window as any).FastAuthController = FastAuthController;

export default function App() {
  globalStyles();

  return (
    <AuthIndicator />
  );
}
