---
name: zalo_login
description: Đăng nhập hoặc đăng nhập lại Zalo Web bằng mã QR để lưu phiên cho zalo_tools. Dùng khi người dùng nói "đăng nhập Zalo", "mở lại Zalo web", khi scripts/check.js báo phiên hết hạn (mã thoát 2), hoặc ở bước đầu của zalo_setup.
---

# Đăng nhập Zalo Web

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Mở một cửa sổ trình duyệt tới `chat.zalo.me` bằng profile riêng của `zalo_tools`. Người dùng quét QR **một lần**; phiên được lưu trong `data/profile/` và được các lần quét sau dùng lại.

## Quy tắc an toàn

- Chỉ đăng nhập tài khoản của chính người dùng, do chính họ quét QR. Không tự nhập thông tin, không chụp hay lưu mã QR.
- `data/profile/` chứa phiên đăng nhập (khoảng 90 MB): không commit, không chia sẻ, không gửi đi đâu.
- Không chạy cùng lúc với `scripts/check.js` hoặc `scripts/build_watchlist.js` vì chung profile (một bên sẽ lỗi khóa). Tác vụ `ZaloCheck` đang bật cũng có thể đang giữ profile.
- Đổi sang **tài khoản Zalo khác**: dùng [zalo_logout](../zalo_logout/SKILL.md) trước, để dữ liệu hai tài khoản không trộn vào nhau.

## Các bước

1. **Điều kiện.** Cần Node.js 20.19 trở lên và thư viện đã cài:
   - Kiểm tra `node_modules/playwright-core`. Chưa có thì chạy `npm install`.
   - Cần Microsoft Edge (có sẵn trên Windows 10/11). `config.js` đang chọn `msedge`; máy chỉ có Chrome thì báo người dùng, không tự đổi code.
2. **Mở cửa sổ đăng nhập** bằng Bash, chạy nền (`run_in_background: true`):

```bash
node scripts/login.js
```

3. **Hướng dẫn người dùng, ngắn gọn:**
   - Quét QR trên cửa sổ vừa mở bằng điện thoại.
   - Đợi danh sách chat hiện ra.
   - **Đóng cửa sổ trình duyệt** để lưu phiên.
4. **Chờ lệnh nền kết thúc.** Không poll và không sleep; thông báo hoàn tất của tác vụ nền chỉ cho biết cửa sổ đã đóng, **không** chứng minh đã đăng nhập thành công.
5. **Xác minh phiên đăng nhập:**

```bash
node scripts/check.js --verify
```

   Chế độ này chỉ đọc danh sách: không mở hội thoại, không ghi `data/state.json` hay dữ liệu theo dõi. **Không** xác minh bằng lệnh thiếu `--verify`: khi đã có mốc, lần quét thường mở hội thoại theo dõi có tin mới (Zalo đánh dấu đã đọc, người gửi thấy "đã xem").
   - Thành công: mã thoát 0 và dòng `Đăng nhập OK: đọc được N hội thoại`. Báo "đã đăng nhập, thấy N hội thoại".
   - Mã thoát 2: chưa đăng nhập xong (chưa quét QR, hoặc đóng cửa sổ quá sớm). Hướng dẫn lại và lặp lại từ bước 2.
   - Mã khác: thường là profile đang bị giữ (cửa sổ đăng nhập chưa đóng hết, hoặc `ZaloCheck` đang chạy). Đợi rồi thử lại.

## Khi nào cần đăng nhập lại

Zalo Web có thể hết hạn phiên hoặc yêu cầu quét lại QR (đổi thiết bị, đăng xuất từ điện thoại, lâu không dùng). Dấu hiệu: `scripts/check.js` thoát mã 2, `data/log/errors.log` có dòng "phiên hết hạn", hoặc mục trạng thái của tác vụ tự động báo kết quả lỗi. Khi đó chạy lại skill này.

## Bước tiếp theo

Nếu đây là lần đầu: tiếp tục [zalo_group](../zalo_group/SKILL.md) hoặc [zalo_watchlist](../zalo_watchlist/SKILL.md). Nếu chỉ đăng nhập lại: đề nghị chạy [zalo_check](../zalo_check/SKILL.md) để cập nhật dữ liệu, nói trước rằng lần quét này có thể mở hội thoại theo dõi có tin mới.
