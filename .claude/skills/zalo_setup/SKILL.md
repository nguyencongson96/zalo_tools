---
name: zalo_setup
description: Thiết lập toàn bộ theo dõi Zalo từ đầu theo trình tự đăng nhập, danh sách theo dõi, quét lần đầu, hỏi có bật quét tự động không, hỏi có báo cáo cuối ngày không. Dùng khi người dùng nói "cài đặt Zalo tracking", "thiết lập theo dõi Zalo", "bắt đầu theo dõi Zalo", hoặc khi thư mục zalo_tools chưa được cấu hình. Điều phối các skill zalo_login, zalo_watchlist, zalo_check, zalo_schedule, zalo_report.
---

# Thiết lập theo dõi Zalo từ đầu

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Điều phối các skill con theo thứ tự. **Không tự bật thứ gì mà người dùng chưa đồng ý.** Hỏi bằng AskUserQuestion ở mỗi điểm quyết định; mỗi bước đã làm rồi thì hỏi giữ hay làm lại, đừng ghi đè âm thầm.

```
0. Kiểm tra môi trường
1. zalo_login      - đăng nhập bằng QR
2. zalo_watchlist  - chọn đối tượng theo dõi, khai tên của tôi
3. zalo_check      - quét lần đầu, lưu mốc
4. Hỏi: bật quét tự động?    -> zalo_schedule (hỏi chu kỳ)
5. Hỏi: có báo cáo cuối ngày? -> nếu có, hỏi giờ -> zalo_schedule (báo cáo) -> zalo_report
6. Tóm tắt những gì đã bật và cách tắt
```

## Bước 0 - Kiểm tra môi trường

- Node.js 18 trở lên: `node -v`. Thiếu thì dừng và hướng dẫn cài (https://nodejs.org/ hoặc `winget install OpenJS.NodeJS.LTS`).
- Thư viện: có `node_modules/playwright-core` chưa. Chưa thì `npm install`.
- Có Microsoft Edge (Windows 10/11 có sẵn).
- Xem hiện trạng để biết bước nào làm rồi: có `data/profile/` (đã đăng nhập), `data/watchlist.json` có nội dung, kết quả `scripts/schedule.ps1 -Action status`.

## Bước 1 - Đăng nhập

Làm theo [zalo_login](../zalo_login/SKILL.md): mở cửa sổ, người dùng quét QR rồi đóng cửa sổ, xác minh bằng `scripts/check.js`. Đã có `data/profile/` thì hỏi "đăng nhập lại hay giữ phiên hiện tại"; mặc định giữ nếu `scripts/check.js` vẫn đọc được danh sách.

## Bước 2 - Danh sách theo dõi

Làm theo [zalo_watchlist](../zalo_watchlist/SKILL.md):
- Hỏi theo dõi những ai: nhập tên, hoặc lấy theo thẻ phân loại của Zalo (liệt kê các thẻ nếu người dùng chưa biết).
- Hỏi tên của họ trong các nhóm và từ khóa quan tâm để điền `data/me.json`; không đoán.
- Cho xem danh sách cuối cùng và xác nhận.

## Bước 3 - Quét lần đầu

Làm theo [zalo_check](../zalo_check/SKILL.md). Giải thích: lần đầu chỉ lưu mốc, chưa báo tin nào; từ lần sau mới phát hiện thay đổi. Cho người dùng biết bảng ở `data/tracking/index.html`.

## Bước 4 - Quét tự động

Hỏi: "Bạn có muốn bật quét Zalo tự động không?" (Có / Không, để sau). Nếu có, chuyển sang [zalo_schedule](../zalo_schedule/SKILL.md): hỏi chu kỳ (đề xuất 5 phút, người dùng có thể chọn khác), nêu đủ điều cần xác nhận và chỉ đăng ký khi họ đồng ý. Nói rõ tác vụ này chạy `scripts/check.js` trực tiếp, không dùng Claude, không tốn token.

## Bước 5 - Báo cáo cuối ngày

Hỏi: "Bạn có cần báo cáo Zalo cuối ngày không?" Nếu có:
1. Hỏi giờ muốn nhận (dạng `HH:mm`, ví dụ 18:00).
2. Nói rõ báo cáo dùng Claude nên tốn token và gửi nội dung `data/tracking/` lên Claude; có trần 1 USD mỗi lần.
3. Nếu chưa bật quét tự động ở bước 4, nhắc rằng báo cáo sẽ tự quét lại trước khi lập nếu dữ liệu cũ hơn 10 phút, nhưng như vậy không bắt được tin theo thời gian thực.
4. Đăng ký qua [zalo_schedule](../zalo_schedule/SKILL.md) khi người dùng đồng ý.
5. Đề nghị xem thử một báo cáo ngay bằng [zalo_report](../zalo_report/SKILL.md) (chế độ tương tác) để họ biết sẽ nhận được gì.

Người dùng chọn không báo cáo thì bỏ qua, không gợi lại.

## Bước 6 - Tóm tắt

Ghi lại cho người dùng:
- Đã đăng nhập tài khoản nào (chỉ nói "đã đăng nhập", không tự nêu thông tin cá nhân khác).
- Số đối tượng đang theo dõi.
- Quét tự động: tắt hay mỗi N phút. Báo cáo cuối ngày: tắt hay lúc HH:mm.
- Nơi xem: `data/tracking/index.html` (tab "Theo dõi" và tab "Báo cáo").
- Cách tắt: dùng skill `zalo_schedule` ("tắt chạy tự động") hoặc `scripts/schedule.ps1 -Action remove`. Khi phiên hết hạn thì dùng `zalo_login`.
- Nhắc: `data/profile/`, `data/tracking/`, `data/log/`, `data/state.json`, `data/watchlist.json`, `data/me.json` chứa dữ liệu nhạy cảm hoặc cá nhân và đã nằm trong `.gitignore`; không ép commit chúng.
