import { createRoot } from "react-dom/client";
import { StyleProvider } from "@ant-design/cssinjs";
import { App } from "./App.tsx";
import "@/libs/dayjs";
import "./index.css";

const container = document.getElementById("root") as HTMLElement;

createRoot(container).render(
  <StyleProvider layer>
    <App />
  </StyleProvider>,
);
