// Quét danh sách hội thoại Zalo Web, so với lần trước, ghi log tin mới.
// Không bao giờ gửi tin. Đọc danh sách hội thoại; với hội thoại THEO DÕI có tin mới thì mở ra đọc đầy đủ (scripts/chat.js).
//   node scripts/check.js            -> chạy ẩn (headless)
//   HEADED=1 node scripts/check.js   -> hiện cửa sổ để debug
//   node scripts/check.js --verify   -> chỉ kiểm tra đăng nhập: đọc danh sách, KHÔNG mở hội thoại, không ghi state/tracking
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const cfg = require('./config');
const tracking = require('./tracking');
const chat = require('./chat');
const { readJson, writeJson } = require('./store');
const { scrollThrough } = require('./list');

const MAX_GAP_TRIES = 3; // số lần đọc lại một hội thoại khi chưa tải được tin cũ tới mốc đã đọc
const WATCHLIST_FILE = cfg.watchlistFile; // tùy chọn: ["Tên A", "Tên B"]
const now = () => new Date().toISOString();

// Đọc các hàng đang được vẽ trên màn hình (danh sách virtualized: chỉ ~14 hàng/lần)
async function readVisible(page) {
  return page.evaluate(() => {
    const txt = (el) => (el ? el.textContent.replace(/ /g, ' ').trim() : '');
    return [...document.querySelectorAll('#conversationList .msg-item')].map((row) => {
      const conv = row.querySelector('.conv-item') || row;
      const ava = row.querySelector('[data-ava-uid]');
      const more = row.querySelector('.conv-item-title__more');
      const body = row.querySelector('.conv-item-body');
      // chưa đọc: chấm .conv-action__unread-v2; số tin nằm trong class fa-N_24_Line
      const unreadEl = row.querySelector('.conv-action__unread-v2');
      const cnt = row.querySelector('.z-noti-badge__content');
      const m = cnt && /fa-(\d+)_/.exec(cnt.className);
      const notiBadge = row.querySelector('.z-noti-badge');
      return {
        uid: ava ? ava.getAttribute('data-ava-uid') : null,
        name: txt(row.querySelector('.conv-item-title__name')),
        preview: txt(row.querySelector('.z-conv-message__preview-message')),
        time: txt(more),                       // giờ của tin cuối (nếu có)
        unread: !!unreadEl,
        unreadCount: m ? Number(m[1]) : (unreadEl ? 1 : 0),
        muted: !!(notiBadge && notiBadge.className.includes('noti-disable')),
        pinned: conv.className.includes('pinned'),
        // nhóm: avatar ghép nhiều ảnh (zavatar-multi), hoặc uid nhóm bắt đầu bằng "g" (nhóm có ảnh riêng)
        isGroup: !!row.querySelector('.zavatar-multi') || String(ava ? ava.getAttribute('data-ava-uid') : '').startsWith('g'),
        // giữ lại class để chỉnh selector nếu Zalo đổi giao diện
        rawClass: conv.className,
        bodyHtmlLen: body ? body.innerHTML.length : 0,
      };
    });
  });
}

// Cuộn hết danh sách để gom mọi hội thoại (cách cuộn: scripts/list.js)
async function scrape(page) {
  await page.waitForSelector('#conversationList .msg-item', { timeout: 30000 });
  await page.waitForTimeout(3000); // chờ danh sách ổn định
  const all = new Map();
  const grab = async () => { for (const r of await readVisible(page)) all.set(`${r.name}|${r.uid}`, r); return all.size; };
  await scrollThrough(page, grab);
  return [...all.values()];
}

(async () => {
  const args = process.argv.slice(2);
  // gõ sai tham số mà vẫn quét thường thì sẽ mở hội thoại ngoài ý muốn -> dừng luôn
  const unknown = args.filter((a) => a !== '--verify');
  if (unknown.length) {
    console.error(`Tham số không hợp lệ: ${unknown.join(' ')}. Chỉ hỗ trợ --verify.`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(cfg.logDir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(cfg.profileDir, {
    channel: cfg.channel,
    headless: !process.env.HEADED,
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });

    let rows;
    try {
      rows = await scrape(page);
    } catch (e) {
      // Không thấy danh sách -> nhiều khả năng phiên hết hạn (đang hiện QR)
      const shot = path.join(cfg.logDir, 'last_error.png');
      await page.screenshot({ path: shot }).catch(() => {});
      const msg = `${now()} LỖI: không đọc được danh sách chat (phiên hết hạn? cần chạy lại login.js). Ảnh: ${shot}`;
      fs.appendFileSync(path.join(cfg.logDir, 'errors.log'), msg + '\n');
      console.error(msg);
      process.exitCode = 2;
      return;
    }

    if (args.includes('--verify')) {
      console.log(`${now()} Đăng nhập OK: đọc được ${rows.length} hội thoại.`);
      return;
    }

    const prev = readJson(cfg.stateFile, null);
    const watch = new Set(readJson(WATCHLIST_FILE, []));
    // đọc/kiểm tra mọi file cần dùng TRƯỚC khi mở hội thoại: file hỏng thì dừng khi chưa tin nào bị đánh dấu đã đọc
    const me = readJson(cfg.meFile, { aliases: [], keywords: [] });
    tracking.preflight();
    const ALERT_MIN = Number(process.env.UNREAD_ALERT_MIN || 30); // cảnh báo tin THEO DÕI chưa đọc quá N phút
    const state = prev ? { ...prev } : {}; // giữ mục cũ: danh sách virtualized chỉ render ~15 hàng
    const fresh = [];
    const reads = [];
    const overdue = [];
    const t = Date.now();

    for (const r of rows) {
      const key = `${r.name}|${r.uid}`; // uid có thể trùng giữa các nhóm (chung ảnh thành viên)
      // KHÔNG đưa r.time vào: đó là giờ tương đối ("4 phút") tự đổi theo thời gian
      const sig = `${r.preview}|${r.unreadCount}`;
      const old = prev && prev[key];
      const watched = watch.has(r.name);

      // mốc bắt đầu "chưa đọc": giữ nguyên khi vẫn chưa đọc, đặt lại khi có tin mới
      const wasUnread = !!(old && old.unread);
      let unreadSince = null;
      if (r.unread) unreadSince = wasUnread && old.unreadSince ? old.unreadSince : t;
      const alerted = r.unread && wasUnread && old.alerted && old.unreadCount >= r.unreadCount;

      if (old && wasUnread && !r.unread) {
        reads.push({ at: now(), name: r.name, uid: r.uid, watched,
                     waitedMin: old.unreadSince ? Math.round((t - old.unreadSince) / 60000) : null,
                     lastPreview: old.preview });
      }
      // tin mới = hội thoại mới xuất hiện, nội dung tin cuối đổi, hoặc số chưa đọc TĂNG (đọc tin làm số giảm -> không tính)
      if (prev && (!old || old.preview !== r.preview || r.unreadCount > (old.unreadCount || 0))) {
        fresh.push({ at: now(), uid: r.uid, name: r.name, preview: r.preview, time: r.time,
                     unread: r.unread, unreadCount: r.unreadCount, muted: r.muted, watched });
      }
      let didAlert = alerted;
      if (prev && watched && r.unread && !r.muted && !alerted && unreadSince && (t - unreadSince) >= ALERT_MIN * 60000) {
        overdue.push({ at: now(), name: r.name, uid: r.uid, unreadCount: r.unreadCount,
                       waitingMin: Math.round((t - unreadSince) / 60000), preview: r.preview });
        didAlert = true;
      }
      state[key] = { name: r.name, sig, preview: r.preview, unread: r.unread, unreadCount: r.unreadCount,
                     unreadSince, alerted: didAlert || false, seenAt: now(),
                     lastMsgTs: old && old.lastMsgTs, gapTries: old && old.gapTries };
    }
    // ---- Mở các hội thoại THEO DÕI vừa có tin mới để đọc đầy đủ nội dung (không chỉ dòng xem trước) ----
    // Hệ quả đã được chấp nhận: Zalo đánh dấu các tin đó là ĐÃ ĐỌC và gửi "đã xem" cho người gửi.
    // NO_OPEN=1 để tắt (quay về chế độ chỉ đọc danh sách).
    let chats = {};
    if (prev && !process.env.NO_OPEN) {
      const targets = fresh.filter((f) => f.watched).map((f) => {
        const key = `${f.name}|${f.uid}`;
        const row = rows.find((r) => r.name === f.name && r.uid === f.uid);
        return { key, name: f.name, uid: f.uid, isGroup: !!(row && row.isGroup),
                 sinceTs: (prev[key] && prev[key].lastMsgTs) || 0, unreadCount: f.unreadCount };
      });
      if (targets.length) chats = await chat.readChats(page, targets);
      for (const [key, c] of Object.entries(chats)) {
        if (c.error) {
          const msg = `${now()} CẢNH BÁO: không đọc được nội dung "${key.split('|')[0]}": ${c.error} (dùng dòng xem trước)`;
          fs.appendFileSync(path.join(cfg.logDir, 'errors.log'), msg + '\n');
          console.error(msg);
          delete chats[key];
          continue;
        }
        // đã mở hội thoại -> Zalo coi là đã đọc: đồng bộ trạng thái để lần quét sau không báo "đã đọc" giả
        let top = c.messages.length ? c.messages[c.messages.length - 1].ts : state[key].lastMsgTs;
        let gapTries = 0;
        if (c.incomplete) {
          // chưa tải được hết tin cũ: giữ mốc cũ để lần sau (khi có tin mới) đọc lại, tối đa MAX_GAP_TRIES lần
          const tries = (state[key].gapTries || 0) + 1;
          const retry = !!c.sinceTs && tries < MAX_GAP_TRIES;
          if (retry) { top = c.sinceTs; gapTries = tries; }
          const msg = `${now()} CẢNH BÁO: "${key.split('|')[0]}" chưa tải hết tin cũ, có thể thiếu tin. ` +
            (retry ? `Giữ mốc cũ, đọc lại khi có tin mới (lần ${tries}/${MAX_GAP_TRIES}).` : 'Không đọc lại, hãy mở Zalo để xem.');
          fs.appendFileSync(path.join(cfg.logDir, 'errors.log'), msg + '\n');
          console.error(msg);
        }
        Object.assign(state[key], { unread: false, unreadCount: 0, unreadSince: null, alerted: false, lastMsgTs: top, gapTries });
      }
    }
    // Thứ tự bắt buộc: lưu NỘI DUNG tin (tracking) trước, rồi mới đẩy mốc trong state.json.
    // Nếu lưu nội dung lỗi, mốc cũ được giữ và lần quét sau đọc lại.
    const tr = tracking.update({ rows, watchNames: [...watch], me, events: { fresh, reads, chats }, nowIso: now() });
    writeJson(cfg.stateFile, state);

    const logTo = (file, o) => fs.appendFileSync(path.join(cfg.logDir, file), JSON.stringify(o) + '\n');
    if (!prev) {
      console.log(`${now()} Lần đầu: đã lưu mốc ${rows.length} hội thoại, chưa báo gì.`);
    } else {
      for (const f of fresh) {
        logTo('new_messages.jsonl', f);
        console.log(`${f.at} TIN MỚI từ "${f.name}"${f.watched ? ' [THEO DÕI]' : ''}: ${f.preview}`);
      }
      for (const r of reads) {
        logTo('read_events.jsonl', r);
        console.log(`${r.at} ĐÃ ĐỌC "${r.name}"${r.watched ? ' [THEO DÕI]' : ''}${r.waitedMin != null ? ` (sau ${r.waitedMin} phút)` : ''}`);
      }
      for (const o of overdue) {
        logTo('overdue.jsonl', o);
        console.log(`${o.at} CHƯA ĐỌC QUÁ ${ALERT_MIN} PHÚT "${o.name}" [THEO DÕI]: ${o.unreadCount} tin, chờ ${o.waitingMin} phút`);
      }
      for (const [key, c] of Object.entries(chats)) {
        const mine = c.messages.filter((m) => m.from !== 'me').length;
        console.log(`${now()} ĐÃ ĐỌC NỘI DUNG "${key.split('|')[0]}" [THEO DÕI]: ${c.messages.length} tin (${mine} từ người khác)`);
      }
      if (!fresh.length && !reads.length && !overdue.length) {
        console.log(`${now()} Không có thay đổi (${rows.length} hội thoại).`);
      }
    }
    console.log(`    -> data/tracking/index.html: ${tr.count} đối tượng, ${tr.unread} tin mới trong 24 giờ`);
    if (process.env.DEBUG_ROWS) console.log(JSON.stringify(rows, null, 1));
  } finally {
    await ctx.close();
  }
})();
