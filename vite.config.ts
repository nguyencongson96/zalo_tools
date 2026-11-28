import { defineConfig } from "vite";
import * as path from "path";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const rootPath = path.resolve(process.cwd());

/** Cổng của scripts/server.js; `npm run dev` chuyển tiếp /api tới đây. */
const apiTarget = `http://127.0.0.1:${process.env.ZALO_UI_PORT || 4780}`;

/**
 * Gốc của dev server là gốc project, nên phải chặn mọi thư mục không thuộc giao diện:
 * data/ chứa phiên đăng nhập Zalo và nội dung tin nhắn. Dùng đường dẫn tuyệt đối để không chặn nhầm node_modules.
 */
const privateDirs = ["data", "scripts", ".claude", ".agents"].map((dir) => `${rootPath.replaceAll("\\", "/")}/${dir}/**`);

export default defineConfig({
  resolve: {
    alias: {
      "~": rootPath,
      "@": `${rootPath}/src`,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": { target: apiTarget, changeOrigin: true } },
    // khai báo deny sẽ thay danh sách mặc định, nên giữ lại các mục mặc định của Vite
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", ...privateDirs] },
    // không theo dõi data/: profile trình duyệt có file bị khóa khi đang quét
    watch: { ignored: privateDirs },
  },
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1500 },
});
