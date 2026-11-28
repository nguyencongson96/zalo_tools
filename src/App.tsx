import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import viVN from "antd/es/locale/vi_VN";
import { AppLayout } from "@/layout";
import { useDashboardPolling, useMediaQuery } from "@/hooks";

const router = createBrowserRouter([{ path: "*", element: <AppLayout /> }]);

export function App() {
  const isDark = useMediaQuery("(prefers-color-scheme: dark)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  useDashboardPolling();

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        // khớp với các biến --gt-* trong index.css
        token: {
          colorPrimary: isDark ? "#6aa6ff" : "#0068ff",
          colorBgContainer: isDark ? "#161b26" : "#ffffff",
          colorTextPlaceholder: isDark ? "#93a0b5" : "#5f6a7d",
          colorTextDescription: isDark ? "#93a0b5" : "#5f6a7d",
          borderRadius: 10,
          fontFamily: "var(--gt-font-family)",
          motion: !reducedMotion,
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
