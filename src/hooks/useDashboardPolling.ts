import { useEffect } from "react";
import { refreshIntervalMs } from "@/constants/watch.constant";
import { useDashboardStore } from "@/store/dashboard";

export function useDashboardPolling() {
  const refresh = useDashboardStore((state) => state.actions.refresh);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refresh]);
}
