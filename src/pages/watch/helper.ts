import { fixedTabs, groupTabPrefix } from "@/constants/watch.constant";
import type { ConversationDTO, DashboardDTO, HistoryEntry } from "@/services/api/dashboard/types";
import { formatDay } from "@/utilities/date";
import type { WatchFilter } from "./types";

export interface WatchTab {
  key: string;
  label: string;
  items: ConversationDTO[];
  newCount: number;
}

/** Một tab cho mỗi nhóm của người dùng, kẹp giữa "Tất cả" và "Chưa phân nhóm". */
export function buildTabs({ groups, conversations }: DashboardDTO): WatchTab[] {
  function toTab(key: string, label: string, items: ConversationDTO[]): WatchTab {
    return { key, label, items, newCount: items.reduce((sum, item) => sum + item.recent.count, 0) };
  }

  const groupTabs = groups.map((group) =>
    toTab(
      `${groupTabPrefix}${group.name}`,
      group.name,
      conversations.filter((item) => item.groups.includes(group.name)),
    ),
  );
  const tabs = [toTab(fixedTabs.all, "Tất cả", conversations), ...groupTabs];
  if (groups.length) {
    const ungrouped = conversations.filter((item) => !item.groups.length);
    tabs.push(toTab(fixedTabs.ungrouped, "Chưa phân nhóm", ungrouped));
  }
  return tabs;
}

/** Bỏ dấu để gõ "khach" vẫn tìm ra "Khách". */
function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();
}

const filterRules: Record<WatchFilter, (item: ConversationDTO) => boolean> = {
  all: () => true,
  recent: (item) => item.recent.count > 0,
  related: (item) => item.recent.related > 0,
  watched: (item) => item.watched,
};

function getPriority(item: ConversationDTO) {
  if (item.recent.related) return 0;
  return item.recent.count ? 1 : 2;
}

/** Có tin liên quan lên đầu, rồi tới có tin mới; trong mỗi mức giữ thứ tự của Zalo. */
export function filterConversations(items: ConversationDTO[], filter: WatchFilter, keyword: string) {
  const needle = normalize(keyword.trim());
  return items
    .filter((item) => filterRules[filter](item) && (!needle || normalize(item.name).includes(needle)))
    .sort((a, b) => getPriority(a) - getPriority(b));
}

/** Số hội thoại khớp một bộ lọc, kèm số tin trong 24 giờ cho hai bộ lọc về tin. */
export function countByFilter(items: ConversationDTO[], filter: WatchFilter) {
  const matched = items.filter(filterRules[filter]);
  function sum(pick: (item: ConversationDTO) => number) {
    return matched.reduce((total, item) => total + pick(item), 0);
  }

  let messages: number | null = null;
  if (filter === "recent") messages = sum((item) => item.recent.count);
  if (filter === "related") messages = sum((item) => item.recent.related);
  return { chats: matched.length, messages };
}

/** Tham số URL mới từ tham số hiện tại; giá trị null thì bỏ tham số đó. */
export function withParams(current: URLSearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export function getRowId(key: string) {
  return `chat-row-${key}`;
}

export function getSender(from: string, chatName: string) {
  if (from === "me") return "Bạn";
  if (from === "them") return chatName;
  return from === "unknown" ? "Không rõ" : from;
}

/** Chỉ giữ tin liên quan; khoảng thiếu tin luôn giữ vì có thể chứa tin liên quan. */
export function isRelatedEntry(entry: HistoryEntry) {
  return entry.type === "gap" || (entry.type === "msg" && entry.rel === "yes" && entry.from !== "me");
}

/** Gom các mục liền nhau cùng ngày (lịch sử đã sắp mới nhất trước). */
export function groupByDay(history: HistoryEntry[]) {
  const days: { day: string; entries: HistoryEntry[] }[] = [];
  for (const entry of history) {
    const day = formatDay(entry.at);
    const last = days[days.length - 1];
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}

export function getInitial(name: string) {
  return (/[\p{L}\p{N}]/u.exec(name)?.[0] ?? "?").toUpperCase();
}

/** Màu ảnh đại diện ổn định theo tên. */
export function getHue(name: string) {
  return [...name].reduce((hue, char) => (hue * 31 + (char.codePointAt(0) ?? 0)) % 360, 7);
}
