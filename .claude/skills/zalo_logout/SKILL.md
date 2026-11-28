---
name: zalo_logout
description: Đăng xuất Zalo khỏi zalo_tools - tắt các tác vụ tự động (ZaloCheck, ZaloReport) và xóa phiên đăng nhập cùng dữ liệu của tài khoản cũ (profile, state, log, tracking, danh sách hội thoại, tùy chọn watchlist, me và nhóm). Dùng khi người dùng nói "đăng xuất Zalo", "xóa dữ liệu Zalo", "đổi tài khoản Zalo", "tắt hết và dọn dẹp". Luôn xem trước và hỏi xác nhận trước khi xóa.
---

# Đăng xuất và dọn dữ liệu

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Dùng `scripts/logout.js`: gỡ ZaloCheck/ZaloReport rồi xóa `data/profile/` (phiên đăng nhập), `data/state.json`, `data/log/`, `data/tracking/`, `data/conversations.json`, `data/group_index.json` và, trừ khi giữ lại, `data/watchlist.json`, `data/me.json`, `data/groups.json`. Chỉ xóa bên trong `data/`; không đụng mã nguồn, giao diện (`src/`, `dist/`), `node_modules`, `.claude`.

Nếu người dùng **chỉ muốn tắt lịch** mà vẫn giữ dữ liệu: dùng [zalo_schedule](../zalo_schedule/SKILL.md) (`-Action remove`), không dùng skill này.

## Các bước

1. **Xem trước (không xóa gì):**

```bash
node scripts/logout.js
```

2. **Hỏi xác nhận rõ ràng** (AskUserQuestion), nêu đúng danh sách vừa in, nói thêm rằng hai tác vụ `ZaloCheck`/`ZaloReport` sẽ bị gỡ (bản xem trước không in mục này) và việc xóa là **không hoàn tác**. Hỏi thêm:
   - Đổi sang tài khoản khác: xóa hết kể cả `data/watchlist.json`, `data/me.json`, `data/groups.json` (cấu hình của tài khoản cũ).
   - Chỉ đăng xuất, muốn giữ cấu hình: thêm `--keep-config`.
   Không xóa nếu người dùng chưa đồng ý trong cuộc trò chuyện này.
3. **Thực hiện:**

```bash
node scripts/logout.js --yes            # xóa hết
node scripts/logout.js --yes --keep-config   # giữ watchlist.json, me.json, groups.json
```

4. **Xác minh:** chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action status`, cả hai tác vụ phải là `DANG TAT`; và `data/profile/` không còn. Mã thoát 1 là còn mục chưa xóa được (thường do cửa sổ Edge của `scripts/login.js`/`scripts/check.js` đang giữ profile): đóng nó rồi chạy lại.
5. **Nhắc người dùng:** xóa `data/profile/` chỉ đăng xuất cục bộ; thiết bị này có thể vẫn hiện trong mục thiết bị đăng nhập của Zalo trên điện thoại, nên đăng xuất ở đó nếu cần.

Giao diện ([zalo_ui](../zalo_ui/SKILL.md)) nếu đang chạy sẽ tự hiện trạng thái trống sau khi xóa; hỏi người dùng có muốn tắt không.

## Bước tiếp theo

Dùng tài khoản khác: [zalo_setup](../zalo_setup/SKILL.md) (hoặc [zalo_login](../zalo_login/SKILL.md)).
