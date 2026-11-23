---
name: zalo_check
description: Quét Zalo Web một lần bằng scripts/check.js, báo tin mới, tin đã đọc và tin chưa đọc quá hạn, đồng thời cập nhật data/tracking/index.html. Dùng khi người dùng hỏi "có tin Zalo mới không", "quét Zalo", "check Zalo", hoặc khi cần dữ liệu mới trước khi báo cáo.
---

# Quét Zalo một lần

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Chạy `scripts/check.js` và diễn giải kết quả. Đây là cùng đoạn mã mà tác vụ tự động `ZaloCheck` chạy (xem [zalo_schedule](../zalo_schedule/SKILL.md)); skill này dùng khi người dùng muốn quét **ngay**.

## Quy tắc an toàn

- **Không bao giờ gửi tin.** Với hội thoại trong `data/watchlist.json` vừa có tin mới, `scripts/check.js` **tự mở hội thoại để đọc đầy đủ nội dung**; việc này khiến Zalo đánh dấu tin là đã đọc và người gửi thấy "đã xem" (người dùng đã chấp nhận). Hội thoại ngoài danh sách theo dõi không bị mở. Nói điều này với người dùng nếu họ ngạc nhiên vì tin biến mất khỏi "chưa đọc". `NO_OPEN=1` tắt hành vi này (chỉ đọc danh sách).
- Không sửa tay `data/state.json` hoặc `data/tracking/.data.json`; không commit `data/tracking/`, `data/log/`, `data/profile/`, `data/state.json` (chứa nội dung tin nhắn và phiên đăng nhập).
- Với hội thoại theo dõi đọc được tin đầy đủ; với hội thoại khác (hoặc khi mở lỗi) chỉ có dòng xem trước của Zalo, có thể bị cắt ("..."); nói rõ điều này khi trích tin.

## Cách chạy

1. Điều kiện: đã đăng nhập (có thư mục `data/profile/`) và đã `npm install` trong thư mục project. Thiếu một trong hai thì chuyển sang [zalo_login](../zalo_login/SKILL.md) hoặc [zalo_setup](../zalo_setup/SKILL.md).
2. Chạy (mất khoảng 15–20 giây, đặt timeout từ 120 giây):

```bash
node scripts/check.js
```

3. Đọc kết quả theo từng dòng:

| Dòng in ra | Ý nghĩa |
|---|---|
| `Lần đầu: đã lưu mốc N hội thoại` | Lần chạy đầu: chỉ lưu mốc, **chưa báo tin nào**. Tin đến trước mốc không được báo. |
| `TIN MỚI từ "X" [THEO DÕI]: ...` | Có tin mới ở hội thoại trong `data/watchlist.json`. Hội thoại không có cờ là ngoài watchlist (không vào bảng tracking). |
| `ĐÃ ĐỌC NỘI DUNG "X" [THEO DÕI]: N tin (M từ người khác)` | Công cụ đã mở hội thoại theo dõi và đọc đủ N tin mới. |
| `ĐÃ ĐỌC "X" (sau N phút)` | Người dùng vừa đọc hội thoại đang chưa đọc (hội thoại ngoài danh sách theo dõi); N là thời gian tin đã chờ. |
| `CHƯA ĐỌC QUÁ 30 PHÚT "X"` | Tin của hội thoại THEO DÕI chưa đọc quá ngưỡng (đổi bằng biến `UNREAD_ALERT_MIN`). |
| `Không có thay đổi` | Không có gì mới. |
| `-> data/tracking/index.html: N đối tượng, M tin mới trong 24 giờ` | Bảng tracking đã được cập nhật. |

4. Mã thoát khác 0:
   - **2**: không đọc được danh sách chat, thường là phiên đăng nhập hết hạn (có `data/log/errors.log` và ảnh `data/log/last_error.png`). Chuyển sang [zalo_login](../zalo_login/SKILL.md).
   - **Lỗi khác, nhất là "profile đang được dùng"**: có cửa sổ đăng nhập hoặc một lần quét khác (tác vụ tự động) đang giữ profile. Đợi 30 giây, thử lại một lần; nếu vẫn lỗi thì báo người dùng đóng cửa sổ Zalo đang mở.
   - Nếu danh sách đọc ra rỗng hoặc thiếu hội thoại dù đã đăng nhập: có thể Zalo đổi giao diện làm selector hỏng. Báo rõ, không đoán.

## Báo cáo cho người dùng

- Mở đầu bằng kết luận: có tin mới không, từ ai, có chưa đọc không. Ưu tiên các dòng `[THEO DÕI]`.
- Với mỗi tin: tên hội thoại, người gửi (nếu là nhóm), nội dung xem trước, chưa đọc hay đã đọc.
- Kết thúc bằng thời điểm quét. Nếu người dùng muốn bảng đầy đủ thì đọc `data/tracking/index.html`; nếu muốn đánh giá tin nào liên quan tới họ thì dùng [zalo_report](../zalo_report/SKILL.md).
