# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

Công cụ theo dõi tin mới trên Zalo Web (Node.js + `playwright-core`, điều khiển Microsoft Edge có sẵn, `channel: 'msedge'`). **Không bao giờ gửi tin.** Nó đọc danh sách hội thoại, và với hội thoại THEO DÕI vừa có tin mới thì **mở hội thoại để đọc đầy đủ** ([scripts/chat.js](scripts/chat.js)); hệ quả đã được người dùng chấp nhận: Zalo đánh dấu tin đó là đã đọc và người gửi thấy "đã xem". Không được mở hội thoại ngoài watchlist, và không được thêm bất kỳ thao tác gửi/nhập tin nào. Không có test, lint hay build (`npm test` chỉ là placeholder). Tài liệu và comment viết bằng tiếng Việt.

## Bố cục

```
scripts/         toàn bộ mã chạy (JS + PowerShell/cmd/vbs) và template.html (giao diện trang theo dõi)
data/            dữ liệu cá nhân, .gitignore: profile/ state.json log/ tracking/ watchlist.json me.json
.claude/skills/  zalo_setup zalo_login zalo_watchlist zalo_check zalo_schedule zalo_report zalo_logout
```

Đường dẫn dữ liệu chỉ khai báo ở [scripts/config.js](scripts/config.js) (`cfg.profileDir`, `cfg.stateFile`, `cfg.logDir`, `cfg.trackingDir`, `cfg.watchlistFile`, `cfg.meFile`); script JS mới phải lấy từ đó, không tự ghép đường dẫn. Các script `.ps1`/`.cmd` tự tính gốc project từ vị trí của chúng (`scripts\..`).

## Lệnh

Chạy từ gốc project:

```
npm install                              # chỉ phụ thuộc playwright-core
node scripts/login.js                    # quét QR một lần, đóng cửa sổ để lưu phiên vào data/profile/
node scripts/check.js                    # quét một lần (headless); HEADED=1 hiện cửa sổ; DEBUG_ROWS=1 in dữ liệu thô từng hàng
node scripts/check.js --verify           # chỉ kiểm tra đăng nhập: không mở hội thoại, không ghi state/tracking
node scripts/build_watchlist.js BIDV     # thêm vào data/watchlist.json mọi chat có nhãn phân loại "BIDV" (chỉ gộp thêm, không xóa)
node scripts/rebuild.js                  # dựng lại data/tracking/index.html từ dữ liệu có sẵn + template (không quét Zalo)
node scripts/logout.js [--yes] [--keep-config]  # đăng xuất cục bộ: mặc định chỉ liệt kê; --yes gỡ tác vụ tự động và xóa data/ (trừ watchlist/me nếu --keep-config)
scripts/run_check.cmd                    # wrapper cho Task Scheduler, ghi data/log/check.log
powershell -File scripts/schedule.ps1 -Action install-check|install-report|remove|status   # ZaloCheck/ZaloReport (-DryRun để xem trước)
powershell -File scripts/run_report.ps1  # báo cáo cuối ngày (-DryRun không gọi Claude)
```

Biến môi trường của `check.js`: `UNREAD_ALERT_MIN` (mặc định 30) — cảnh báo tin THEO DÕI chưa đọc quá N phút.

Mã thoát `2` của `check.js` = phiên hết hạn (xem `data/log/errors.log`, `data/log/last_error.png`) → chạy lại `login.js`.

**Không chạy `check.js`, `login.js`, `build_watchlist.js` cùng lúc**: chúng dùng chung `data/profile/` (khóa profile Chromium).

## Kiến trúc

Luồng dữ liệu: `check.js` → `data/state.json` / `data/log/*.jsonl` → `tracking.js` → `data/tracking/index.html` → skill `zalo_report`.

- [scripts/config.js](scripts/config.js): URL, kênh trình duyệt và mọi đường dẫn dùng chung.
- [scripts/store.js](scripts/store.js): đọc/ghi JSON dùng chung; script JS mới phải đọc/ghi file dữ liệu qua đây. `readJson` chỉ trả mặc định khi file chưa tồn tại (bỏ BOM, file hỏng thì báo lỗi), `writeJson` ghi qua file tạm rồi đổi tên. `check.js` đọc/kiểm tra mọi file trước khi mở hội thoại và chỉ ghi `state.json` sau khi `tracking.update()` đã lưu nội dung tin.
- [scripts/list.js](scripts/list.js): cuộn danh sách hội thoại (`scrollList`, `scrollThrough`), dùng chung cho `check.js`, `chat.js`, `build_watchlist.js`. Phần tử cuộn là phần tử CHA của `#conversationList`.
- [scripts/check.js](scripts/check.js): mở profile đã đăng nhập, cuộn `#conversationList` (danh sách *virtualized*, chỉ ~14 hàng được vẽ mỗi lần nên phải cuộn và gom vào `Map`), rồi so với `state.json` để phát hiện:
  - tin mới → `log/new_messages.jsonl`; chuyển từ chưa đọc sang đã đọc → `log/read_events.jsonl`;
  - tin THEO DÕI chưa đọc quá hạn (dựa vào `unreadSince`, `alerted` trong state; thực tế ít kích hoạt vì hội thoại theo dõi bị mở và đọc ngay).
  - Hội thoại THEO DÕI có tin mới (xem/preview đổi hoặc số chưa đọc tăng) được `chat.readChats()` mở, đọc mọi tin có mốc `ts` > `lastMsgTs` trong state (id tin `bb_msg_id_<ms>` chính là mốc thời gian; lần đầu chưa có mốc thì lấy `max(unreadCount,1)` tin cuối), cuộn lên nạp tin cũ khi cần (chờ tới khi tin cũ xuất hiện, rồi cuộn dần xuống để gom hết; giới hạn thời gian mỗi hội thoại và mỗi lần quét). Chưa tới được mốc thì `incomplete`: ghi cảnh báo, thêm mục `type: 'gap'` vào lịch sử, giữ mốc cũ để đọc lại khi có tin mới (tối đa 3 lần, đếm bằng `gapTries` trong state). Sau khi mở, state của hội thoại được đặt `unread:false` để lần quét sau không ghi nhận "đã đọc" giả. Phải khớp CHÍNH XÁC tên hàng và kiểm tra `#chatViewContainer .header-title` (khớp theo chữ từng mở nhầm hội thoại). `NO_OPEN=1` tắt toàn bộ bước này.
  - Khóa hội thoại là `name|uid` (uid có thể trùng giữa các nhóm). Chữ ký tin gồm `preview|unreadCount`, **cố ý không có `time`** vì đó là giờ tương đối ("4 phút") tự đổi. State cũ được giữ lại (`{...prev}`) vì list virtualized không bao giờ trả đủ mọi hàng.
  - Selector DOM của Zalo (`.msg-item`, `.conv-item-title__name`, `.conv-action__unread-v2`, `data-ava-uid`, …) nằm trong `readVisible`; nếu Zalo đổi giao diện thì sửa ở đây (`rawClass`/`DEBUG_ROWS=1` để chẩn đoán).
- [scripts/tracking.js](scripts/tracking.js): sinh **một file duy nhất** `data/tracking/index.html` (tab "Theo dõi" + tab "Báo cáo"; CSS/JS nội tuyến) từ `tracking/.data.json` (tối đa 200 mục lịch sử/đối tượng; mỗi tin có `id`=ts, `at`, `from`, `text`, `kind`, `rel`) và `tracking/.reports.json` (báo cáo Markdown theo ngày, giữ 60 ngày). `update()` được `check.js` gọi mỗi lần quét, `saveReport()` do `save_report.js` gọi; cả hai kết thúc bằng `rebuild()`. Đánh giá "liên quan đến tôi" bằng **quy tắc** (không dùng AI) dựa trên `me.json`: chat riêng = có; nhóm nhắc alias/keyword = có; nhóm khác = không; bản thân nhắn = không. `parsePreview` tách người gửi từ dòng xem trước ("Bạn: …", "Tên: …") khi không đọc được tin đầy đủ. "Tin mới" trong giao diện = tin của người khác trong 24 giờ gần nhất (`recentOf`), vì cờ "chưa đọc" của Zalo không còn ý nghĩa với hội thoại bị công cụ mở.
- [scripts/template.html](scripts/template.html): **template giao diện duy nhất** (CSS + JS + khung HTML, chỗ giữ chỗ `{{TITLE}}` và `{{BODY}}`). Muốn đổi UI chỉ sửa file này rồi chạy `node scripts/rebuild.js`; không nhúng CSS/JS vào code JS. File nằm ngoài `data/` nên logout không xóa, và mọi trang sinh ra luôn đồng nhất.
- [scripts/render.js](scripts/render.js): `page()` nạp template trên; `esc()` escape mọi nội dung tin nhắn; cùng bộ chuyển Markdown→HTML tối giản (dùng cho tab Báo cáo) (không cài thư viện ngoài). [scripts/save_report.js](scripts/save_report.js): nhận báo cáo Markdown của Claude và đưa vào tab "Báo cáo" của `index.html`; dùng bởi `run_report.ps1` và skill `zalo_report`.
- [scripts/build_watchlist.js](scripts/build_watchlist.js): quét cả tab "Ưu tiên" và "Khác" theo nhãn. Chỉ ghi hội thoại thật sự mang nhãn, và mọi cú bấm phải qua `clickOutsideChats` (không bấm vào hàng hội thoại hay khung chat).
- `scripts/schedule.ps1` / `run_hidden.vbs` / `run_report.ps1`: Task Scheduler. **ZaloCheck** gọi `run_check.cmd` định kỳ (không dùng Claude); **ZaloReport** chạy `claude -p` với skill `zalo_report` (`--tools` và `--allowedTools` chỉ Read/Glob/Grep/Skill, `--strict-mcp-config`, trần ngân sách), script đưa kết quả vào tab "Báo cáo" qua `save_report.js`. `run_hidden.vbs` chờ tiến trình xong và trả đúng mã thoát. Không chuyển hướng stderr của `node` trong PowerShell 5.1 khi `ErrorActionPreference=Stop` (node bị tắt giữa chừng). Tác vụ đã đăng ký trỏ tới đường dẫn tuyệt đối của `scripts/run_hidden.vbs`: nếu di chuyển file/thư mục này thì phải `install-*` lại.

## Skills (`.claude/skills/`)

Cách dùng thông thường là qua skill thay vì gõ lệnh tay: `zalo_setup` điều phối `zalo_login` → `zalo_watchlist` → `zalo_check` → `zalo_schedule` → `zalo_report`. `zalo_report` chỉ đọc dữ liệu tracking/log, không quét Zalo. `zalo_schedule` luôn hỏi xác nhận trước khi đăng ký tác vụ. `zalo_logout` (dùng `scripts/logout.js`) tắt lịch và xóa dữ liệu của tài khoản cũ; luôn xem trước và hỏi xác nhận trước khi xóa.

## Dữ liệu cá nhân

Cả `data/` nằm trong `.gitignore` (chứa phiên đăng nhập và nội dung tin nhắn). `watchlist.json` là mảng tên hội thoại khớp **chính xác** với tên hiển thị; `me.json` có `aliases` và `keywords`.
