// Phải khớp với dữ liệu do scripts/view.js trả về.

export type Relevance = "yes" | "unknown" | "no";

export interface MessageEntry {
  type: "msg";
  at: string;
  /** Có `id` khi đọc từ trong hội thoại; không có khi lấy từ dòng xem trước (`at` là giờ quét). */
  id?: number;
  from: string;
  text: string;
  rel?: Relevance;
  truncated?: boolean;
}

export interface ReadEntry {
  type: "read";
  at: string;
  waitedMin: number | null;
}

/** Khoảng có thể thiếu tin; `since` = 0 là không rõ điểm bắt đầu (mốc ms). */
export interface GapEntry {
  type: "gap";
  at: string;
  since: number;
  to: number;
}

export type HistoryEntry = MessageEntry | ReadEntry | GapEntry;

export interface ConversationDTO {
  key: string;
  name: string;
  isGroup: boolean;
  watched: boolean;
  groups: string[];
  preview: string;
  unreadCount: number;
  muted: boolean;
  observedAt: string | null;
  lastChange: string | null;
  lastMessage: { from: string; text: string; rel: Relevance; why: string } | null;
  recent: { count: number; related: number };
  history: HistoryEntry[];
}

export interface GroupDTO {
  name: string;
  chats: string[];
}

export interface ReportDTO {
  date: string;
  /** HTML đã được server escape (scripts/markdown.js). */
  html: string;
}

export interface DashboardDTO {
  updatedAt: string | null;
  groups: GroupDTO[];
  conversations: ConversationDTO[];
  reports: ReportDTO[];
}
