---
name: zalo_setup
description: Thiết lập toàn bộ theo dõi Zalo từ đầu theo trình tự đăng nhập, gom nhóm hội thoại, danh sách theo dõi, quét lần đầu, hỏi có bật quét tự động không, hỏi có báo cáo cuối ngày không. Dùng khi người dùng nói "cài đặt Zalo tracking", "thiết lập theo dõi Zalo", "bắt đầu theo dõi Zalo", hoặc khi thư mục zalo_tools chưa được cấu hình. Điều phối các skill zalo_login, zalo_group, zalo_watchlist, zalo_check, zalo_ui, zalo_schedule, zalo_report.
---

# Thiết lập theo dõi Zalo từ đầu

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Điều phối các skill con theo thứ tự. **Không tự bật thứ gì mà người dùng chưa đồng ý.** Hỏi bằng AskUserQuestion ở mỗi điểm quyết định; mỗi bước đã làm rồi thì hỏi giữ hay làm lại, đừng ghi đè âm thầm.

```
0. Kiểm tra môi trường
1. zalo_login      - đăng nhập bằng QR, chuẩn bị giao diện
   zalo_group      - (hỏi trước) gom hội thoại thành nhóm / tab
2. zalo_watchlist  - chọn đối tượng theo dõi, khai tên của tôi
3. zalo_check      - quét, lấy dữ liệu theo dõi
4. Hỏi: bật quét tự động?    -> zalo_schedule (hỏi chu kỳ)
5. Hỏi: có báo cáo cuối ngày? -> nếu có, hỏi giờ -> zalo_schedule (báo cáo) -> zalo_report
6. Tóm tắt những gì đã bật và cách tắt
```

## Bước 0 - Kiểm tra môi trường

- Node.js 20.19 trở lên: `node -v`. Thiếu thì dừng và hướng dẫn cài (https://nodejs.org/ hoặc `winget install OpenJS.NodeJS.LTS`).
- Thư viện: có `node_modules/playwright-core` và `node_modules/vite` chưa. Thiếu thì `npm install` (cần mạng, vài phút).
- Giao diện: có `dist/index.html` chưa. Chưa thì `npm run build` (sau `npm install`, vốn cài cả thư viện giao diện).
- Có Microsoft Edge (Windows 10/11 có sẵn).
- Xem hiện trạng để biết bước nào làm rồi: có `data/profile/` (đã đăng nhập), `data/watchlist.json` có nội dung, kết quả `scripts/schedule.ps1 -Action status`.

## Bước 1 - Đăng nhập

Làm theo [zalo_login](../zalo_login/SKILL.md): mở cửa sổ, người dùng quét QR rồi đóng cửa sổ, xác minh bằng `node scripts/check.js --verify` (không mở hội thoại). Đã có `data/profile/` thì hỏi "đăng nhập lại hay giữ phiên hiện tại"; mặc định giữ nếu lệnh `--verify` thoát mã 0.

## Gom nhóm (sau đăng nhập, tùy chọn)

Hỏi: "Bạn có muốn gom các hội thoại thành nhóm (mỗi nhóm một tab) không?" Nếu có, làm theo [zalo_group](../zalo_group/SKILL.md): quét danh sách (không mở hội thoại nào), liệt kê có đánh số, người dùng trả lời để gom. Không muốn thì bỏ qua, làm sau lúc nào cũng được.

## Bước 2 - Danh sách theo dõi

Làm theo [zalo_watchlist](../zalo_watchlist/SKILL.md):
- Chưa có `data/state.json` (cần để xác minh tên): chạy `node scripts/check.js` một lần. Lần đầu chỉ lưu mốc, không mở hội thoại nào.
- Hỏi theo dõi những ai: nhập tên, hoặc lấy theo thẻ phân loại của Zalo (người dùng xem tên thẻ trong menu "Phân loại" trên Zalo; công cụ không liệt kê được các thẻ).
- Hỏi tên của họ trong các nhóm và từ khóa quan tâm để điền `data/me.json`; không đoán.
- Cho xem danh sách cuối cùng và xác nhận.

## Bước 3 - Quét và lấy dữ liệu theo dõi

Trước khi chạy, nói rõ: hội thoại theo dõi có tin mới kể từ mốc sẽ được mở để đọc (Zalo đánh dấu đã đọc, người gửi thấy "đã xem"). Rồi làm theo [zalo_check](../zalo_check/SKILL.md). Tin đến trước mốc không được báo. Mở giao diện cho người dùng xem theo [zalo_ui](../zalo_ui/SKILL.md); giải thích rằng trang này tự cập nhật sau mỗi lần quét.

## Bước 4 - Quét tự động

Hỏi: "Bạn có muốn bật quét Zalo tự động không?" (Có / Không, để sau). Nếu có, chuyển sang [zalo_schedule](../zalo_schedule/SKILL.md): hỏi chu kỳ (đề xuất 5 phút, người dùng có thể chọn khác), nêu đủ điều cần xác nhận và chỉ đăng ký khi họ đồng ý. Nói rõ tác vụ này chạy `scripts/check.js` trực tiếp, không dùng Claude, không tốn token; và mỗi lần quét, hội thoại theo dõi có tin mới bị tự mở (đã đọc, người gửi thấy "đã xem"), kể cả khi người dùng không ngồi ở máy.

## Bước 5 - Báo cáo cuối ngày

Hỏi: "Bạn có cần báo cáo Zalo cuối ngày không?" Nếu có:
1. Hỏi giờ muốn nhận (dạng `HH:mm`, ví dụ 18:00).
2. Nói rõ báo cáo dùng Claude nên tốn token và gửi nội dung tin nhắn cùng cấu hình trong `data/` (tracking, nhật ký, `me.json`) lên Claude; có trần 1 USD mỗi lần.
3. Nói rõ nếu dữ liệu cũ hơn 10 phút, tác vụ báo cáo tự quét trước khi lập, và lần quét đó cũng mở hội thoại theo dõi có tin mới như ở bước 4. Nếu chưa bật quét tự động, nhắc thêm rằng chỉ quét lúc báo cáo thì không bắt được tin theo thời gian thực.
4. Đăng ký qua [zalo_schedule](../zalo_schedule/SKILL.md) khi người dùng đồng ý.
5. Đề nghị xem thử một báo cáo ngay bằng [zalo_report](../zalo_report/SKILL.md) (chế độ tương tác) để họ biết sẽ nhận được gì.

Người dùng chọn không báo cáo thì bỏ qua, không gợi lại.

## Bước 6 - Tóm tắt

Ghi lại cho người dùng:
- Trạng thái đăng nhập (chỉ nói "đã đăng nhập", không tự nêu thông tin cá nhân).
- Số đối tượng đang theo dõi.
- Quét tự động: tắt hay mỗi N phút. Báo cáo cuối ngày: tắt hay lúc HH:mm.
- Nơi xem: `http://127.0.0.1:4780/` (trang "Theo dõi" có tab theo nhóm, và trang "Báo cáo"), tự cập nhật khi dữ liệu đổi. Giao diện phải đang chạy: bấm đúp `scripts/start_ui.cmd` (xem [zalo_ui](../zalo_ui/SKILL.md)).
- Cách tắt: dùng skill `zalo_schedule` ("tắt chạy tự động") hoặc `scripts/schedule.ps1 -Action remove`. Khi phiên hết hạn thì dùng `zalo_login`.
- Nhắc: mọi thứ trong `data/` (phiên đăng nhập, tin nhắn, danh sách, nhóm) chứa dữ liệu nhạy cảm hoặc cá nhân và đã nằm trong `.gitignore`; không ép commit chúng.
