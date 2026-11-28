import { create } from "zustand";

export interface WatchState {
  /** Để trong store (không đưa lên URL) cho bộ gõ tiếng Việt không bị ngắt; vẫn giữ khi chuyển trang. */
  keyword: string;
}

export interface WatchActions {
  setKeyword: (keyword: string) => void;
}

export const useWatchStore = create<WatchState & { actions: WatchActions }>((set) => ({
  keyword: "",
  actions: {
    setKeyword(keyword) {
      set({ keyword });
    },
  },
}));
