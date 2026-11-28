# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

Công cụ theo dõi tin mới trên Zalo Web (Node.js + `playwright-core`, điều khiển Microsoft Edge có sẵn, `channel: 'msedge'`). **Không bao giờ gửi tin.** Nó đọc danh sách hội thoại, và với hội thoại THEO DÕI vừa có tin mới thì **mở hội thoại để đọc đầy đủ** ([scripts/chat.js](scripts/chat.js)); hệ quả đã được người dùng chấp nhận: Zalo đánh dấu tin đó là đã đọc và người gửi thấy "đã xem". Không được mở hội thoại ngoài watchlist, và không được thêm bất kỳ thao tác gửi/nhập tin nào. Không có test (`npm test` chỉ là placeholder); giao diện React ở gốc project (`src/`) có build và lint. Tài liệu và comment viết bằng tiếng Việt.

## Bố cục

```
scripts/         mã chạy phía máy (JS CommonJS + PowerShell/cmd/vbs), gồm server cục bộ cho giao diện
src/             giao diện React (Vite + React 19 + TypeScript strict + antd 6 + Zustand + React Router 7); build ra dist/
data/            dữ liệu cá nhân, .gitignore: profile/ state.json log/ tracking/ conversations.json groups.json group_index.json watchlist.json me.json
.claude/skills/  zalo_setup zalo_login zalo_group zalo_watchlist zalo_check zalo_ui zalo_schedule zalo_report zalo_logout
```

Đường dẫn dữ liệu chỉ khai báo ở [scripts/config.js](scripts/config.js) (`cfg.profileDir`, `cfg.stateFile`, `cfg.logDir`, `cfg.trackingDir`, `cfg.watchlistFile`, `cfg.meFile`, `cfg.conversationsFile`, `cfg.groupsFile`, `cfg.groupIndexFile`, `cfg.uiDistDir`, `cfg.uiPort`); script JS mới phải lấy từ đó, không tự ghép đường dẫn. Các script `.ps1`/`.cmd` tự tính gốc project từ vị trí của chúng (`scripts\..`).

## Lệnh

Chạy từ gốc project:

```
npm install                              # thư viện cho cả script (playwright-core) và giao diện
npm run build                            # build giao diện ra dist/ (Node 20.19+)
npm run ui                               # server cục bộ + mở trình duyệt (cổng 4780, ZALO_UI_PORT)
npm run dev                              # dev server của Vite (proxy /api về cổng 4780)
npm run lint                             # eslint src/
node scripts/login.js                    # quét QR một lần, đóng cửa sổ để lưu phiên vào data/profile/
node scripts/check.js                    # quét một lần (headless); HEADED=1 hiện cửa sổ; DEBUG_ROWS=1 in dữ liệu thô từng hàng
node scripts/check.js --verify           # chỉ kiểm tra đăng nhập: không mở hội thoại, không ghi state/tracking
node scripts/check.js --list             # ghi data/conversations.json để gom nhóm: không mở hội thoại, không ghi state/tracking
node scripts/groups.js list [--ungrouped] | show | apply <ops.json>   # nhóm do người dùng đặt (không đụng Zalo)
node scripts/build_watchlist.js BIDV     # thêm vào data/watchlist.json mọi chat có nhãn phân loại "BIDV" (chỉ gộp thêm, không xóa)
node scripts/logout.js [--yes] [--keep-config]  # đăng xuất cục bộ: mặc định chỉ liệt kê; --yes gỡ tác vụ tự động và xóa data/ (trừ watchlist/me/groups nếu --keep-config)
scripts/run_check.cmd                    # wrapper cho Task Scheduler, ghi data/log/check.log
powershell -File scripts/schedule.ps1 -Action install-check|install-report|remove|status   # ZaloCheck/ZaloReport (-DryRun để xem trước)
powershell -File scripts/run_report.ps1  # báo cáo cuối ngày (-DryRun không gọi Claude)
```

Biến môi trường của `check.js`: `UNREAD_ALERT_MIN` (mặc định 30) — cảnh báo tin THEO DÕI chưa đọc quá N phút.

Mã thoát `2` của `check.js` = phiên hết hạn (xem `data/log/errors.log`, `data/log/last_error.png`) → chạy lại `login.js`.

**Không chạy `check.js`, `login.js`, `build_watchlist.js` cùng lúc**: chúng dùng chung `data/profile/` (khóa profile Chromium).

## Kiến trúc

Luồng dữ liệu: `check.js` → `data/state.json` / `data/log/*.jsonl` / `data/conversations.json` → `tracking.js` → `data/tracking/*.json` → `view.js` → `server.js` (`GET /api/dashboard`) → `src/`; skill `zalo_report` đọc thẳng dữ liệu trong `data/`.

- [scripts/config.js](scripts/config.js): URL, kênh trình duyệt và mọi đường dẫn dùng chung.
- [scripts/store.js](scripts/store.js): đọc/ghi JSON dùng chung; script JS mới phải đọc/ghi file dữ liệu qua đây. `readJson` chỉ trả mặc định khi file chưa tồn tại (bỏ BOM, file hỏng thì báo lỗi), `writeJson` ghi qua file tạm rồi đổi tên. `check.js` đọc/kiểm tra mọi file trước khi mở hội thoại và chỉ ghi `state.json` sau khi `tracking.update()` đã lưu nội dung tin.
- [scripts/list.js](scripts/list.js): cuộn danh sách hội thoại (`scrollList`, `scrollThrough`), dùng chung cho `check.js`, `chat.js`, `build_watchlist.js`. Phần tử cuộn là phần tử CHA của `#conversationList`.
- [scripts/check.js](scripts/check.js): mở profile đã đăng nhập, cuộn `#conversationList` (danh sách *virtualized*, chỉ ~14 hàng được vẽ mỗi lần nên phải cuộn và gom vào `Map`), rồi so với `state.json` để phát hiện:
  - tin mới → `log/new_messages.jsonl`; chuyển từ chưa đọc sang đã đọc → `log/read_events.jsonl`;
  - tin THEO DÕI chưa đọc quá hạn (dựa vào `unreadSince`, `alerted` trong state; thực tế ít kích hoạt vì hội thoại theo dõi bị mở và đọc ngay).
  - Hội thoại THEO DÕI có tin mới (xem/preview đổi hoặc số chưa đọc tăng) được `chat.readChats()` mở, đọc mọi tin có mốc `ts` > `lastMsgTs` trong state (id tin `bb_msg_id_<ms>` chính là mốc thời gian; lần đầu chưa có mốc thì lấy `max(unreadCount,1)` tin cuối), cuộn lên nạp tin cũ khi cần (chờ tới khi tin cũ xuất hiện, rồi cuộn dần xuống để gom hết; giới hạn thời gian mỗi hội thoại và mỗi lần quét). Chưa tới được mốc thì `incomplete`: ghi cảnh báo, thêm mục `type: 'gap'` vào lịch sử, giữ mốc cũ để đọc lại khi có tin mới (tối đa 3 lần, đếm bằng `gapTries` trong state). Sau khi mở, state của hội thoại được đặt `unread:false` để lần quét sau không ghi nhận "đã đọc" giả. Phải khớp CHÍNH XÁC tên hàng và kiểm tra `#chatViewContainer .header-title` (khớp theo chữ từng mở nhầm hội thoại). `NO_OPEN=1` tắt toàn bộ bước này.
  - Khóa hội thoại là `name|uid` (uid có thể trùng giữa các nhóm). Chữ ký tin gồm `preview|unreadCount`, **cố ý không có `time`** vì đó là giờ tương đối ("4 phút") tự đổi. State cũ được giữ lại (`{...prev}`) vì list virtualized không bao giờ trả đủ mọi hàng.
  - Selector DOM của Zalo (`.msg-item`, `.conv-item-title__name`, `.conv-action__unread-v2`, `data-ava-uid`, …) nằm trong `readVisible`; nếu Zalo đổi giao diện thì sửa ở đây (`rawClass`/`DEBUG_ROWS=1` để chẩn đoán).
- [scripts/tracking.js](scripts/tracking.js): chỉ xử lý dữ liệu, không dựng giao diện. `tracking/.data.json` (tối đa 200 mục lịch sử/đối tượng; tin đọc từ hội thoại có `id`=ts, `kind`; tin lấy từ dòng xem trước không có `id` và `at` là giờ quét) và `tracking/.reports.json` (Markdown theo ngày, giữ 60 ngày). Đánh giá "liên quan đến tôi" bằng **quy tắc** (không dùng AI) dựa trên `me.json`: chat riêng = có; nhóm nhắc alias/keyword = có; nhóm khác = không; bản thân nhắn = không. "Tin mới" = tin của người khác trong 24 giờ (`recentOf`).
- [scripts/conversations.js](scripts/conversations.js): danh sách MỌI hội thoại (chỉ từ danh sách, không mở chat), ghi bởi lần quét thường và `check.js --list`.
- [scripts/groups.js](scripts/groups.js): nhóm do người dùng đặt (`groups.json`: `[{ name, chats }]`, khớp theo tên hội thoại, một hội thoại thuộc nhiều nhóm). `list` lưu số thứ tự vào `group_index.json` để `apply` hiểu đúng số dù Zalo đổi thứ tự; một thao tác sai thì không ghi gì. Nhóm độc lập với watchlist. Gom nhóm chỉ qua chat (skill `zalo_group`); giao diện chỉ xem.
- [scripts/view.js](scripts/view.js) / [scripts/server.js](scripts/server.js): ghép dữ liệu và phục vụ `dist/`. Server **chỉ đọc**, chỉ nghe `127.0.0.1`, kiểm tra header `Host`, không có CORS; giữ nguyên các chốt này. Hội thoại ngoài watchlist chỉ trả dòng xem trước, không trả lịch sử. Hình dạng dữ liệu phải khớp [src/services/api/dashboard/types.ts](src/services/api/dashboard/types.ts).
- [scripts/markdown.js](scripts/markdown.js): Markdown→HTML tối giản cho báo cáo, escape mọi nội dung, chỉ cho liên kết http(s). Đây là nơi duy nhất tạo HTML được giao diện chèn bằng `dangerouslySetInnerHTML`. [scripts/save_report.js](scripts/save_report.js) lưu báo cáo; dùng bởi `run_report.ps1` và skill `zalo_report`.
- Gốc project là một package `"type": "module"`; `scripts/package.json` khai `commonjs` nên script vẫn dùng `require` (đừng xóa file này). Gốc của Vite dev server cũng là gốc project: `vite.config.ts` chặn `data/`, `scripts/`, `.claude/` bằng `server.fs.deny`, giữ nguyên chốt này.
- `src/`: kiến trúc theo project tham chiếu của người dùng: route khai báo ở `src/routes/index.tsx` (`ROUTE_ENUMS`), `pages/<tên>/{index.tsx,components,helper.ts,types.ts,styles.module.less}`, API ở `services/api/<domain>` (export namespace), store Zustand ở `store/`, hằng ở `constants/`, token màu `--gt-*` trong `index.css`. Dùng khai báo `function`, named export, alias `@/`.
- [scripts/build_watchlist.js](scripts/build_watchlist.js): quét cả tab "Ưu tiên" và "Khác" theo nhãn. Chỉ ghi hội thoại thật sự mang nhãn, và mọi cú bấm phải qua `clickOutsideChats` (không bấm vào hàng hội thoại hay khung chat).
- `scripts/schedule.ps1` / `run_hidden.vbs` / `run_report.ps1`: Task Scheduler. **ZaloCheck** gọi `run_check.cmd` định kỳ (không dùng Claude); **ZaloReport** chạy `claude -p` với skill `zalo_report` (`--tools` và `--allowedTools` chỉ Read/Glob/Grep/Skill, `--strict-mcp-config`, trần ngân sách), script lưu kết quả qua `save_report.js`. `run_hidden.vbs` chờ tiến trình xong và trả đúng mã thoát. Không chuyển hướng stderr của `node` trong PowerShell 5.1 khi `ErrorActionPreference=Stop` (node bị tắt giữa chừng). Tác vụ đã đăng ký trỏ tới đường dẫn tuyệt đối của `scripts/run_hidden.vbs`: nếu di chuyển file/thư mục này thì phải `install-*` lại.

## Skills (`.claude/skills/`)

Cách dùng thông thường là qua skill thay vì gõ lệnh tay: `zalo_setup` điều phối `zalo_login` → `zalo_group` (tùy chọn) → `zalo_watchlist` → `zalo_check` → `zalo_schedule` → `zalo_report`. `zalo_ui` là chỗ duy nhất mô tả cách chạy giao diện localhost (lý do dùng React thay `index.html` tĩnh: trang đang mở tự cập nhật khi dữ liệu đổi); skill khác liên kết tới nó, không chép lại hướng dẫn và không sinh trang HTML tĩnh. `zalo_report` chỉ đọc dữ liệu tracking/log, không quét Zalo. `zalo_schedule` luôn hỏi xác nhận trước khi đăng ký tác vụ. `zalo_logout` (dùng `scripts/logout.js`) tắt lịch và xóa dữ liệu của tài khoản cũ; luôn xem trước và hỏi xác nhận trước khi xóa.

## Dữ liệu cá nhân

Cả `data/` nằm trong `.gitignore` (chứa phiên đăng nhập và nội dung tin nhắn). `watchlist.json` là mảng tên hội thoại khớp **chính xác** với tên hiển thị; `me.json` có `aliases` và `keywords`; `groups.json` và `conversations.json` chứa tên danh bạ.
