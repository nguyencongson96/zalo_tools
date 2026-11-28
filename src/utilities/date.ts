import { dayjs } from "@/libs/dayjs";

export function formatDateTime(value: string | number | null) {
  return value ? dayjs(value).format("DD/MM HH:mm") : "—";
}

export function formatTime(value: string | number) {
  return dayjs(value).format("HH:mm");
}

function isToday(value: string | number) {
  return dayjs(value).isSame(dayjs(), "day");
}

function isYesterday(value: string | number) {
  return dayjs(value).isSame(dayjs().subtract(1, "day"), "day");
}

/** "Hôm nay", "Hôm qua" hoặc ngày đầy đủ. */
export function formatDay(value: string | number) {
  if (isToday(value)) return "Hôm nay";
  return isYesterday(value) ? "Hôm qua" : dayjs(value).format("DD/MM/YYYY");
}

/** Mốc ngắn cho danh sách: hôm nay chỉ hiện giờ. */
export function formatListTime(value: string) {
  if (isToday(value)) return formatTime(value);
  return isYesterday(value) ? "Hôm qua" : dayjs(value).format("DD/MM");
}

export function formatFromNow(value: string) {
  return dayjs(value).fromNow();
}

export function isOlderThan(value: string, ms: number) {
  return dayjs().diff(value) > ms;
}

export function formatReportDate(value: string) {
  return dayjs(value).format("DD/MM/YYYY");
}
