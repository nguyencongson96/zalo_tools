import axios, { AxiosError } from "axios";

/** Chỉ gọi server cục bộ (scripts/server.js), chỉ đọc. */
export const webHttp = axios.create({ baseURL: "/api", timeout: 15_000 });

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
    if (!error.response) return "Không kết nối được server giao diện. Chạy `npm run ui` trong thư mục project.";
  }
  return error instanceof Error ? error.message : "Lỗi không xác định";
}
