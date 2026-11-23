---
name: zalo_report
description: Lập báo cáo từ dữ liệu theo dõi Zalo đã thu thập (tracking và log) cho một khoảng thời gian, thường là cuối ngày, nêu tin nào cần xử lý và tin nào liên quan tới người dùng. Chỉ đọc, không quét Zalo. Dùng khi người dùng nói "tóm tắt Zalo", "báo cáo Zalo hôm nay", "tin nào liên quan tôi", hoặc khi tác vụ ZaloReport gọi ở chế độ không tương tác.
---

# Báo cáo Zalo

> Đường dẫn trong skill này tính từ gốc project `zalo_tools` (thư mục có `package.json`, `scripts/` và `.claude/skills`).

Đọc dữ liệu **đã có** và đánh giá nội dung bằng chính khả năng đọc hiểu của bạn. Skill này **không quét Zalo**; muốn dữ liệu mới thì dùng [zalo_check](../zalo_check/SKILL.md) trước. Khác với `check` (lấy dữ liệu, báo thay đổi), skill này tổng hợp và nhận xét.

## Hai chế độ

- **Tương tác** (người dùng hỏi trực tiếp): được hỏi lại khung thời gian; hỏi có muốn lưu báo cáo không.
- **Không tương tác**: prompt có cụm `NON-INTERACTIVE` (do tác vụ ZaloReport gọi). Không hỏi gì, không ghi file; **chỉ in báo cáo cuối cùng** ra đầu ra chuẩn bằng Markdown tiếng Việt. Script `scripts/run_report.ps1` đưa Markdown đó vào tab "Báo cáo" của trang `data/tracking/index.html` (qua `scripts/save_report.js`). Ở chế độ này chỉ dùng công cụ đọc (Read, Glob, Grep).

## Nguồn dữ liệu (đường dẫn tính từ gốc project)

| File | Nội dung |
|---|---|
| `data/tracking/index.html` | Bảng tổng hợp (HTML); dòng phụ đề đầu trang có "Cập nhật lúc" (giờ máy). Đây là trang HTML cho người xem; để phân tích nên đọc `.data.json` bên dưới |
| `data/tracking/.data.json` | Dữ liệu có cấu trúc theo từng đối tượng: `name`, `isGroup`, `unread`, `unreadCount`, `muted`, `last`, `lastRead`, `lastMsgTs`, `history[]` (tối đa 200 mục, mới nhất trước: `type` = `msg` hoặc `read`; tin có `id`, `at` (giờ nhắn thật), `from` (`me` = người dùng, `them` = người kia trong chat riêng, hoặc tên người gửi trong nhóm), `text`, `kind` (`text`/`sticker`/`photo`/`file`/...), `rel`, `why`; mục `read` có `waitedMin`). `unread`/`unreadCount` luôn gần như 0 với hội thoại theo dõi vì công cụ tự mở chúng |
| `data/log/new_messages.jsonl`, `data/log/read_events.jsonl`, `data/log/overdue.jsonl` | Nhật ký sự kiện |
| `data/me.json` | Tên và từ khóa của người dùng |
| `data/watchlist.json` | Các đối tượng đang theo dõi |

Mọi mốc thời gian `at` trong file là ISO UTC (kết thúc bằng `Z`): **đổi sang giờ máy** (giờ Việt Nam là UTC+7) trước khi so với "hôm nay" hay hiển thị.

## Các bước

1. **Khung thời gian.** Mặc định từ 00:00 đến hiện tại của hôm nay (giờ máy). Người dùng nói khác ("hôm qua", "3 giờ qua") thì theo họ.
2. **Độ mới của dữ liệu.** Đọc "Cập nhật lúc" trong `data/tracking/index.html` (hoặc `observedAt` trong `.data.json`). Nếu cũ hơn khoảng 30 phút: ghi cảnh báo ở đầu báo cáo ("dữ liệu cập nhật lần cuối lúc HH:mm"). Chế độ tương tác thì đề nghị chạy `check`; chế độ không tương tác thì chỉ cảnh báo.
3. **Gom tin trong khung.** Từ `history[]` lấy các mục `msg` trong khung thời gian cho từng đối tượng, cùng trạng thái hiện tại (`unread`, `unreadCount`, `muted`).
4. **Đánh giá "liên quan đến tôi" theo nội dung**, không chỉ theo quy tắc của script (cột "Liên quan" trong file chỉ là gợi ý ban đầu). Coi là liên quan khi:
   - gửi riêng cho người dùng, hoặc nhắc tên/`@` của họ (`aliases` trong `data/me.json`);
   - hỏi, nhờ, giao việc, hẹn hạn chót; hoặc nói về tiền, hóa đơn, chứng từ, khách hàng mà họ phụ trách;
   - có từ khóa trong `data/me.json`.
   Không liên quan: tin do chính người dùng nhắn, thông báo chung, trò chuyện không dính tới họ. Tin chỉ có hình ảnh, sticker hoặc bị cắt cụt không đủ để kết luận thì ghi **"chưa rõ"**, đừng đoán.
   Mỗi đánh giá kèm lý do trong một mệnh đề ngắn.
5. **Cuối cuộc trò chuyện ai nói sau cùng.** Nếu tin cuối trong một hội thoại là của người dùng (`from` = `me`) và sau tin của người kia, có thể họ đã trả lời. Nếu tin cuối là của người kia mà còn chưa đọc, đó là việc cần xử lý. Chỉ nói "có thể đã trả lời", không khẳng định.

## Cấu trúc báo cáo (tiếng Việt, Markdown)

```
# Báo cáo Zalo - <ngày> (<khung giờ>)
_Dữ liệu cập nhật lúc HH:mm_  [kèm cảnh báo nếu dữ liệu cũ]

## Tóm tắt
- N tin mới trong khung; M hội thoại có tin mới; K tin liên quan tới bạn.

## Cần xử lý ngay
(mới và liên quan; sắp xếp theo mức khẩn; mỗi mục: tên hội thoại, người gửi, nội dung, vì sao liên quan)

## Đã đọc nhưng nên theo dõi
(liên quan, đã đọc, có việc chưa rõ đã xử lý hay chưa)

## Tin chung / không liên quan
(một dòng mỗi hội thoại, gọn)

## Giới hạn dữ liệu
```

"Giới hạn dữ liệu" luôn có, nêu những điều sau khi đúng: hội thoại theo dõi có nội dung đầy đủ từng tin (công cụ tự mở hội thoại để đọc, nên Zalo coi là đã đọc, cờ "chưa đọc" không phản ánh việc người dùng đã đọc), hội thoại không đọc được thì chỉ có dòng xem trước có thể bị cắt; ảnh/sticker/tệp chỉ hiện nhãn, không có nội dung; chỉ gồm đối tượng trong `data/watchlist.json`; lịch sử bắt đầu từ lúc bắt đầu theo dõi và tối đa 200 mục mỗi đối tượng; tin đến trước lần quét đầu tiên không có; các khoảng thời gian máy tắt hoặc chưa quét bị trống; đánh giá liên quan là nhận định, không phải sự thật.

Không có tin nào trong khung: nói thẳng "không có tin mới" kèm thời điểm dữ liệu, đừng kéo dài báo cáo.

## Lưu báo cáo (chế độ tương tác)

Chỉ lưu khi người dùng muốn. Báo cáo được thêm vào tab "Báo cáo" của **một trang HTML duy nhất** `data/tracking/index.html` để người dùng mở bằng trình duyệt (không cần app đọc Markdown):

1. Ghi báo cáo Markdown vừa viết ra một file tạm ngoài thư mục dữ liệu (ví dụ trong thư mục tạm của hệ thống hoặc scratchpad).
2. Chạy (từ gốc project): `node scripts/save_report.js <yyyy-MM-dd> <đường-dẫn-file-tạm>`. Script lưu báo cáo vào `data/tracking/.reports.json` (cùng ngày thì ghi đè) và dựng lại `data/tracking/index.html`.
3. Nhắc người dùng bấm đúp `data/tracking/index.html` rồi chọn tab "Báo cáo".

Báo cáo chứa nội dung tin nhắn nên `data/` đã nằm trong `.gitignore`; không gửi hay đăng ở nơi khác nếu người dùng không yêu cầu. Không sửa bất kỳ file dữ liệu theo dõi nào.
