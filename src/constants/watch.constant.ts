import type { Relevance } from "@/services/api/dashboard/types";

/** Khóa của hai tab cố định. Tab nhóm có khóa `group:<tên>` nên không bao giờ trùng. */
export const fixedTabs = { all: "all", ungrouped: "ungrouped" } as const;
export const groupTabPrefix = "group:";

/** Tham số trên URL: tab nhóm, bộ lọc và hội thoại đang mở (tải lại trang vẫn giữ). */
export const watchParams = { tab: "tab", filter: "filter", chat: "chat" } as const;

export const watchFilters = [
  { value: "all", label: "Tất cả" },
  { value: "recent", label: "Có tin mới" },
  { value: "related", label: "Liên quan đến bạn" },
  { value: "watched", label: "Đang theo dõi" },
] as const;

export const relevanceLabels: Record<Relevance, string> = {
  yes: "Liên quan đến bạn",
  unknown: "Chưa rõ",
  no: "Không liên quan",
};

/** Chu kỳ tải lại dữ liệu từ server cục bộ. */
export const refreshIntervalMs = 30_000;

/** Lần quét cuối cũ hơn mốc này thì giao diện cảnh báo dữ liệu có thể đã cũ. */
export const staleAfterMs = 60 * 60_000;

/** Số tin hiện trong lịch sử trước khi bấm "Xem thêm". */
export const historyPageSize = 30;

/** Màn hình hẹp: danh sách và chi tiết hiện lần lượt. Khớp với breakpoint trong styles.module.less. */
export const narrowScreenQuery = "(max-width: 899px)";
