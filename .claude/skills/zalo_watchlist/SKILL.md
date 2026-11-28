---
name: zalo_watchlist
description: Quản lý danh sách đối tượng Zalo cần theo dõi (data/watchlist.json) và thông tin của người dùng (data/me.json: tên trong nhóm, từ khóa). Dùng khi người dùng nói "thêm X vào theo dõi", "bỏ X", "lấy các chat nhãn BIDV", "khai tên tôi", hoặc ở bước thiết lập của zalo_setup.
---

# Quản lý danh sách theo dõi

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Chỉ các hội thoại nằm trong `data/watchlist.json` mới được gắn cờ `[THEO DÕI]`, được lưu lịch sử và được tự mở để đọc đầy đủ khi có tin mới (Zalo sẽ đánh dấu các tin đó là đã đọc, người gửi thấy "đã xem"). Hội thoại ngoài danh sách vẫn được quét (dòng xem trước vẫn vào nhật ký `data/log/`) nhưng không được lưu lịch sử. Phân loại thành tab là việc khác, xem [zalo_group](../zalo_group/SKILL.md).

## Hai file cấu hình

| File | Dạng | Dùng để |
|---|---|---|
| `data/watchlist.json` | Mảng tên: `["Harley Quinn", "RMS DEV Nội bộ"]` | Chọn đối tượng theo dõi |
| `data/me.json` | `{ "aliases": [...], "keywords": [...] }` | Đánh giá "liên quan đến tôi" |

Cả hai chứa thông tin cá nhân (tên người trong danh bạ Zalo, tên của người dùng) nên không được commit; `.gitignore` của project đã loại trừ chúng. Sửa bằng công cụ Read/Edit/Write (UTF-8), **không** dùng `echo` hay one-liner của shell vì tên tiếng Việt, emoji và dấu ngoặc dễ bị shell làm hỏng.

## Quy tắc quan trọng

- **Khớp theo tên hiển thị, đúng từng ký tự** (phân biệt hoa thường, kể cả `【】`, `[ ]`, dấu cách). Đổi tên hội thoại trên Zalo thì không còn khớp.
- **Không bịa tên.** Chỉ thêm tên có thật. Để kiểm tra, đọc `data/state.json`: mỗi khóa có dạng `"Tên|uid"`, phần trước dấu `|` là tên hội thoại Zalo đã thấy ở lần quét gần nhất. Người dùng gõ gần đúng thì gợi ý tên khớp nhất và hỏi lại. Chưa có file này thì chạy `node scripts/check.js` một lần (lần đầu chỉ lưu mốc, không mở hội thoại).
- **Trùng tên:** mọi hội thoại cùng tên hiển thị đều khớp và đều bị tự mở. Nếu `data/state.json` có hơn một khóa cùng tên (khác `uid`), báo người dùng trước khi thêm.
- Xóa tên thì liệt kê danh sách hiện tại và xác nhận đúng mục cần xóa.
- `My Documents` là kho ghi chú cá nhân, không bao giờ có tin từ người khác: gợi ý không theo dõi.

## Thao tác

**Xem:** đọc `data/watchlist.json`, in dạng danh sách đánh số.

**Thêm theo tên:** xác minh tên với `data/state.json`, rồi thêm vào mảng (không trùng lặp).

**Thêm theo thẻ phân loại của Zalo** (ví dụ "BIDV", "Working", "Gia đình"):

```bash
node scripts/build_watchlist.js "BIDV"
```

Script mở Zalo Web ẩn, áp bộ lọc theo thẻ, cuộn hết danh sách, thêm các tên tìm được vào `data/watchlist.json` (gộp, không xóa tên đang có) rồi bỏ bộ lọc. Cần đã đăng nhập và không có cửa sổ Zalo nào khác đang mở. Tên thẻ phải khớp đúng một thẻ có trong menu "Phân loại"; không khớp thì script báo và không ghi gì. Script chỉ thêm hội thoại thật sự mang thẻ đó; không hàng nào mang thẻ (bộ lọc không áp được, hoặc Zalo đổi giao diện) thì script thoát mã 1 và không ghi gì. Sau khi chạy, đọc lại `data/watchlist.json` và cho người dùng xem danh sách đã thêm để họ loại bớt.

**Khai thông tin của tôi (`data/me.json`):**
- `aliases`: tên người dùng được gọi trong các nhóm, đúng như hiển thị trên Zalo (ví dụ `Nguyễn Văn A`) hoặc dạng nhắc `@Văn A`. **Hỏi người dùng**, không đoán từ tên máy, email hay tên người trong tin nhắn: dòng "@Tên ..." thường là người dùng nhắc người khác.
- `keywords`: các từ cho thấy một tin liên quan tới họ (ví dụ `hóa đơn`, `BIDV`, `báo cáo`).

Tác dụng của `data/me.json` lên đánh giá "Liên quan đến bạn" trên giao diện:

| Tình huống | Kết quả |
|---|---|
| Người dùng tự nhắn | Không |
| Tin có tên người dùng hoặc từ khóa | Có |
| Chat riêng, người kia nhắn | Có |
| Nhóm, không nhắc tới người dùng, đã khai tên | Không |
| Nhóm, chưa khai tên | Chưa rõ |

Đây chỉ là quy tắc đơn giản; đánh giá theo nội dung do [zalo_report](../zalo_report/SKILL.md) làm.

## Sau khi sửa

Giao diện đang mở (xem [zalo_ui](../zalo_ui/SKILL.md)) tự nhận thay đổi sau tối đa 30 giây, không cần quét: đối tượng bỏ theo dõi hiện nhãn "Không theo dõi", đối tượng mới chưa có lịch sử. Muốn có dữ liệu cho đối tượng mới thì chạy [zalo_check](../zalo_check/SKILL.md) (lần quét này có thể mở hội thoại theo dõi có tin mới). Đối tượng mới bắt đầu theo dõi từ trạng thái hiện tại, **không có lịch sử trước đó**.
