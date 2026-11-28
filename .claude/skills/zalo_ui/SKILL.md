---
name: zalo_ui
description: Mở và giữ chạy giao diện React theo dõi Zalo trên localhost (thay cho trang index.html cũ). Trang đang mở tự cập nhật khi dữ liệu thay đổi. Dùng khi người dùng nói "mở giao diện Zalo", "xem bảng theo dõi", "mở localhost", "giao diện không cập nhật", "tắt giao diện", hoặc khi skill khác vừa đổi dữ liệu và cần cho người dùng xem kết quả.
---

# Giao diện theo dõi (React trên localhost)

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Địa chỉ: `http://127.0.0.1:4780/` (trang "Theo dõi") và `http://127.0.0.1:4780/reports` (trang "Báo cáo"). Đổi cổng bằng biến môi trường `ZALO_UI_PORT`.

## Vì sao dùng React thay cho index.html

Trang `index.html` cũ là file tĩnh, chỉ chứa dữ liệu tại lúc được tạo. Giao diện React lấy dữ liệu từ server cục bộ, nên **khi dữ liệu trong `data/` đổi thì trang đang mở đổi theo**, không phải tạo lại file hay mở lại trang.

- Không tạo, không mở và không chỉ người dùng tới `data/tracking/index.html`. Thấy file đó còn sót thì là bản cũ, lần quét thường kế tiếp sẽ xóa.
- `dist/index.html` là file của bản build: mở trực tiếp bằng trình duyệt sẽ không chạy. Luôn dùng địa chỉ localhost.

## Khi nào dữ liệu hiện lên

Trang tự tải lại dữ liệu mỗi 30 giây (hoặc ngay khi bấm nút tải lại), giữ nguyên tab, bộ lọc, ô tìm kiếm và hội thoại đang mở; không cần F5.

| Thay đổi | Hiện trên giao diện |
|---|---|
| Quét xong ([zalo_check](../zalo_check/SKILL.md) hoặc tác vụ `ZaloCheck`) | Tin mới, lịch sử, giờ "Quét gần nhất" |
| Lưu báo cáo ([zalo_report](../zalo_report/SKILL.md) hoặc `ZaloReport`) | Trang "Báo cáo" |
| Gom nhóm ([zalo_group](../zalo_group/SKILL.md)) | Các tab nhóm |
| Sửa danh sách theo dõi ([zalo_watchlist](../zalo_watchlist/SKILL.md)) | Nhãn theo dõi và lịch sử hiển thị |
| Sửa `data/me.json` | Chỉ ảnh hưởng đánh giá "liên quan" của tin quét **sau đó** |

Giao diện **không tự quét Zalo**. "Quét gần nhất" đứng yên nghĩa là chưa có lần quét mới; muốn cập nhật liên tục thì bật quét tự động ([zalo_schedule](../zalo_schedule/SKILL.md)).

## Đảm bảo giao diện đang chạy

Làm bước này sau khi đổi dữ liệu mà người dùng muốn xem.

1. Chưa có `dist/index.html`: chạy `npm install` rồi `npm run build` (cần mạng, vài phút).
2. Chạy nền (`run_in_background: true`):

```bash
node scripts/server.js
```

   Gọi lại nhiều lần vẫn an toàn: nếu giao diện đã chạy, lệnh in `Giao diện đang chạy sẵn` rồi thoát; nếu chưa, nó tiếp tục chạy (không phải lỗi). Không mở thêm tab trình duyệt.
3. Chỉ khi người dùng muốn **mở** trang thì chạy `npm run ui` (mở trình duyệt), cũng chạy nền.
4. Nói địa chỉ cho người dùng, và rằng trang đang mở tự cập nhật. Server do Claude chạy có thể dừng khi phiên Claude kết thúc: muốn dùng lâu dài thì người dùng **bấm đúp `scripts/start_ui.cmd`** và giữ cửa sổ đó mở.

## Sau khi cập nhật mã

Đổi **dữ liệu** không cần build. Chỉ khi mã giao diện đổi (`git pull`, sửa `src/`) mới chạy `npm install` và `npm run build`, rồi người dùng tải lại trang. Không dùng `npm run dev` cho người dùng cuối (chỉ để phát triển).

## Sự cố

| Hiện tượng | Xử lý |
|---|---|
| Trang không mở, hoặc báo "Không kết nối được server giao diện" | Server đã dừng: làm lại mục "Đảm bảo giao diện đang chạy" |
| "Chưa build giao diện" | `npm install` rồi `npm run build` |
| "Không mở được cổng 4780" | Chương trình khác giữ cổng: đặt `ZALO_UI_PORT` sang số khác |
| Trang báo file JSON hỏng | Báo người dùng tên file trong thông báo; không tự xóa dữ liệu |
| Dữ liệu không đổi | Xem "Quét gần nhất"; kiểm tra `schedule.ps1 -Action status` và phiên đăng nhập ([zalo_login](../zalo_login/SKILL.md)) |

## Tắt và an toàn

- Tắt: đóng cửa sổ `start_ui.cmd`, hoặc dừng tác vụ nền đã chạy server. Không tự tắt tiến trình khác trên máy.
- Server chỉ đọc và chỉ nghe `127.0.0.1`. Không mở ra mạng, không tạo đường hầm hay chia sẻ địa chỉ này: nó hiển thị nội dung tin nhắn.
