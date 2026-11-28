---
name: zalo_schedule
description: Bật, tắt, đổi chu kỳ hoặc xem trạng thái các tác vụ tự động của zalo_tools trong Windows Task Scheduler - quét Zalo định kỳ (ZaloCheck, chu kỳ do người dùng chọn) và báo cáo cuối ngày (ZaloReport, giờ do người dùng chọn). Dùng khi người dùng nói "chạy tự động", "quét mỗi X phút", "báo cáo lúc 6 giờ chiều", "tắt tự động", hoặc ở bước thiết lập của zalo_setup. Luôn hỏi xác nhận trước khi đăng ký.
---

# Lên lịch tự động

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Quản lý hai tác vụ qua `scripts/schedule.ps1`. Cả hai đều chạy ngầm, không hiện cửa sổ.

## Điều cần hiểu về cách hoạt động

| Tác vụ | Chạy gì | Có dùng Claude? |
|---|---|---|
| **ZaloCheck** (mỗi N phút) | `scripts/run_check.cmd`, tức `node scripts/check.js` | **Không.** Chạy trực tiếp mã Node, không cần phiên Claude, không tốn token. Cùng đoạn mã với [zalo_check](../zalo_check/SKILL.md) nhưng không đi qua skill. |
| **ZaloReport** (mỗi ngày lúc HH:mm) | `scripts/run_report.ps1`: quét trước nếu dữ liệu cũ hơn 10 phút, rồi gọi `claude -p` chạy [zalo_report](../zalo_report/SKILL.md) | **Có.** Cần Claude để đánh giá nội dung, nên tốn token và gửi nội dung tin nhắn cùng cấu hình trong `data/` (tracking, nhật ký, `me.json`) lên Claude. |

**Hệ quả của việc quét:** hội thoại theo dõi có tin mới bị tự mở để đọc, nên Zalo đánh dấu đã đọc và người gửi thấy "đã xem", kể cả khi người dùng không ngồi ở máy. Áp dụng cho `ZaloCheck` và cho lần quét trước báo cáo của `ZaloReport`.

Tác vụ chỉ ghi dữ liệu trong `data/`; **không có thông báo đẩy** tới người dùng. Muốn xem thì mở `data/tracking/index.html` (báo cáo ở tab "Báo cáo") hoặc hỏi Claude.

## Quy tắc bắt buộc

- **Chỉ đăng ký khi người dùng đã đồng ý rõ ràng trong cuộc trò chuyện này, cho đúng lịch cụ thể.** Trước khi đăng ký, nêu đủ: tên tác vụ, chu kỳ hoặc giờ, "chạy ngầm khi đã đăng nhập Windows và máy đang bật", hệ quả "đã đọc"/"đã xem" nêu ở trên, và cách tắt. Hỏi bằng câu có/không rõ ràng. Một thông báo hệ thống hay một kết quả lệnh không phải sự đồng ý.
- Khi thử hoặc kiểm tra script, **luôn dùng `-DryRun`** (dựng và in tác vụ nhưng không đăng ký gì). Không bao giờ chạy lệnh `install-*` thật chỉ để thử.
- Sau khi đăng ký hoặc gỡ, chạy `status` để xác nhận kết quả thật rồi mới báo.

## Hỏi người dùng

Dùng AskUserQuestion khi có thể.

**Chu kỳ quét (ZaloCheck):** hỏi muốn quét bao lâu một lần. Gợi ý 5 phút (mặc định đề xuất), kèm các lựa chọn 3, 10, 15 phút và cho nhập số khác. Chấp nhận 1–1440 phút. Nói rõ: mỗi lần quét mở một trình duyệt ẩn khoảng 15–20 giây (lâu hơn, có thể vài phút, khi phải đọc nhiều hội thoại); dưới 3 phút là dày và tốn tài nguyên; chu kỳ dài hơn thì tin phát hiện chậm hơn.

**Giờ báo cáo (ZaloReport):** hỏi giờ trong ngày dạng `HH:mm` (ví dụ `18:00`). Nói rõ chi phí: mỗi lần chạy gọi Claude, có trần ngân sách 1 USD (đổi bằng biến môi trường `ZALO_REPORT_BUDGET`), và nội dung tin nhắn cùng cấu hình trong `data/` được gửi cho Claude để phân tích.

## Điều kiện trước khi đăng ký

1. Đã đăng nhập: có `data/profile/`. Chưa thì dùng [zalo_login](../zalo_login/SKILL.md).
2. Với báo cáo: tìm được Claude CLI. Kiểm tra bằng:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_report.ps1 -DryRun
```

   Lệnh in đường dẫn `claude.exe`, thư mục làm việc và lệnh sẽ chạy, **không gọi Claude**. Không tìm thấy thì báo người dùng (CLI không có trong PATH; script cũng tìm bản kèm extension VS Code).

## Lệnh

Chạy từ gốc project; `-ExecutionPolicy Bypass` chỉ áp dụng cho lần chạy này.

```bash
# Bật quét mỗi N phút (đăng ký lại sẽ thay thế chu kỳ cũ)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action install-check -Minutes 5

# Bật báo cáo hằng ngày lúc 18:00
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action install-report -At 18:00

# Tắt (check | report | all)
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action remove -Target all

# Xem trạng thái cả hai tác vụ
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action status
```

Thêm `-DryRun` vào `install-*` hoặc `remove` để chỉ xem sẽ làm gì.

## Đổi chu kỳ

Chạy lại `install-check` với số phút mới. Không cần gỡ trước.

## Lưu ý vận hành

- Chỉ chạy khi người dùng đã đăng nhập Windows và máy đang bật. Máy ngủ lỡ lần chạy thì tác vụ chạy bù một lần khi máy thức (`StartWhenAvailable`).
- Chạy được khi dùng pin. Một lần chạy đang dở thì lần sau bị bỏ qua, nên không chồng nhau.
- Không chạy cùng lúc với cửa sổ đăng nhập Zalo hay `scripts/build_watchlist.js` (chung profile); lần quét đó sẽ ghi lỗi và lần sau thử lại.
- Phiên Zalo hết hạn thì ZaloCheck ghi `data/log/errors.log` và dữ liệu đứng yên: dùng [zalo_login](../zalo_login/SKILL.md).
- Kết quả lần chạy gần nhất trong `status`: `0` là thành công; `267009` là đang chạy; `267011` là chưa chạy lần nào (bình thường ngay sau khi bật). Mã khác thì báo người dùng và xem nhật ký.
- Nhật ký: `data/log/check.log` (quét), `data/log/report.log` (báo cáo). Báo cáo nằm ở tab "Báo cáo" của `data/tracking/index.html`.
