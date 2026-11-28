import { create } from "zustand";
import { DashboardAPI } from "@/services/api";
import { getErrorMessage } from "@/services";

export interface DashboardState {
  data: DashboardAPI.DashboardDTO | null;
  error: string;
  loading: boolean;
}

export interface DashboardActions {
  refresh: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState & { actions: DashboardActions }>((set, get) => ({
  data: null,
  error: "",
  loading: false,
  actions: {
    async refresh() {
      if (get().loading) return;
      set({ loading: true });
      try {
        set({ data: await DashboardAPI.getDashboard(), error: "" });
      } catch (error) {
        // giữ dữ liệu cũ trên màn hình, chỉ báo lỗi
        set({ error: getErrorMessage(error) });
      } finally {
        set({ loading: false });
      }
    },
  },
}));
