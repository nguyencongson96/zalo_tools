// Mở từng hội thoại trong danh sách theo dõi và đọc ĐẦY ĐỦ các tin mới (không chỉ dòng xem trước).
//
// LƯU Ý (đã được người dùng chấp nhận): việc mở một hội thoại khiến Zalo
//   - đánh dấu các tin trong đó là ĐÃ ĐỌC trên tài khoản của bạn, và
//   - gửi trạng thái "đã xem" cho người gửi.
// Vì vậy chỉ mở các hội thoại nằm trong data/watchlist.json VÀ vừa có tin mới. Không bao giờ gửi tin.
//
// Selector (Zalo Web) dùng ở đây - nếu Zalo đổi giao diện thì sửa tại các hằng số bên dưới:
//   #chatViewContainer .header-title       tên hội thoại đang mở
//   #messageViewScroll .chat-item          mỗi tin nhắn (class "me" = tin của bạn)
//   [id^="bb_msg_id_"]                     id tin = mốc thời gian (ms) của tin
//   .message-sender-name-content .truncate tên người gửi (chỉ ở tin đầu của một cụm tin liền nhau trong nhóm)
//   [id^="mtc-"]                           phần chữ của tin
const { scrollList } = require('./list');

const MAX_OPEN = 25;        // tối đa số hội thoại mở trong một lần quét
const MAX_FIRST = 30;       // lần đầu (chưa có mốc): chỉ lấy tối đa N tin cuối
// Nạp tin cũ: giới hạn theo thời gian (không theo số lần cuộn), nằm trong giới hạn 20 phút của tác vụ ZaloCheck
const LOAD_WAIT_MS = 5000;        // chờ tối đa mỗi lần Zalo nạp thêm tin cũ
const MAX_STALLS = 2;             // số lần liên tiếp không nạp thêm được gì thì dừng
const CHAT_BUDGET_MS = 30000;     // tổng thời gian nạp tin cũ cho một hội thoại
const SCAN_BUDGET_MS = 8 * 60000; // hết khoảng này kể từ khi bắt đầu mở thì các hội thoại sau không nạp tin cũ nữa
const MAX_SWEEP = 600;            // số bước tối đa khi cuộn ngược xuống để gom tin

// Tìm hàng đúng TÊN (khớp chính xác) trong danh sách và bấm vào. Trả về true nếu mở đúng hội thoại.
async function openConversation(page, name, uid) {
  await scrollList(page, 'top');
  await page.waitForTimeout(400);
  let found = false;
  for (let i = 0; i < 60 && !found; i++) {
    found = await page.evaluate(({ name, uid }) => {
      document.querySelectorAll('[data-zt-open]').forEach((e) => e.removeAttribute('data-zt-open'));
      for (const row of document.querySelectorAll('#conversationList .msg-item')) {
        const n = ((row.querySelector('.conv-item-title__name') || {}).textContent || '').replace(/ /g, ' ').trim();
        const a = row.querySelector('[data-ava-uid]');
        if (n === name && (!uid || (a && a.getAttribute('data-ava-uid') === uid))) {
          (row.querySelector('.conv-item') || row).setAttribute('data-zt-open', '1');
          return true;
        }
      }
      return false;
    }, { name, uid });
    if (found) break;
    const s = await scrollList(page, 'down');
    await page.waitForTimeout(s.moved ? 350 : 900);
    if (!s.moved && i > 6) break;
  }
  if (!found) return false;
  await page.click('[data-zt-open="1"]', { timeout: 5000 });
  // xác nhận đã mở đúng hội thoại (tránh đọc nhầm hội thoại khác)
  await page.waitForFunction((n) => {
    const h = document.querySelector('#chatViewContainer .header-title');
    return h && h.textContent.replace(/ /g, ' ').trim() === n;
  }, name, { timeout: 8000 });
  await page.waitForSelector('#messageViewScroll .chat-item', { timeout: 8000 });
  await page.waitForTimeout(800);
  return true;
}

// Đọc các tin đang được vẽ trong khung chat
function extractMessages(page, isGroup) {
  return page.evaluate((isGroup) => {
    const nb = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const out = [];
    let lastSender = null;
    for (const it of document.querySelectorAll('#messageViewScroll .chat-item')) {
      const bb = it.querySelector('[id^="bb_msg_id_"]');
      if (!bb) continue;
      const ts = Number(bb.id.replace('bb_msg_id_', ''));
      if (!ts) continue;
      const me = it.classList.contains('me') || !!it.querySelector('.message-wrapper--me');
      const sEl = it.querySelector('.message-sender-name-content .truncate');
      if (me) lastSender = null;
      else if (sEl) lastSender = nb(sEl.textContent);
      const mtc = it.querySelector('[id^="mtc-"]');
      let text = mtc ? nb(mtc.textContent) : '';
      let kind = 'text';
      let hint = '';
      if (!text) {
        if (it.querySelector('.sticker-message')) { kind = 'sticker'; text = '[Sticker]'; }
        else if (it.querySelector('.photo-message-v2, .img-msg-v2')) { kind = 'photo'; text = '[Hình ảnh]'; }
        else {
          const ma = it.querySelector('.message-action') || it;
          const cls = new Set();
          ma.querySelectorAll('[class]').forEach((e) => String(e.className).split(/\s+/).forEach((c) => c && cls.add(c)));
          const all = [...cls].join(' ');
          hint = [...cls].filter((c) => !/^(flx|rel|abs|fa-|message-reaction|msg-reaction|reaction|emoji|react|card-send-time|floating)/.test(c)).slice(0, 10).join(' ');
          if (/file|attach|document/i.test(all)) { kind = 'file'; text = '[Tệp đính kèm]'; }
          else if (/video/i.test(all)) { kind = 'video'; text = '[Video]'; }
          else if (/voice|audio/i.test(all)) { kind = 'voice'; text = '[Tin nhắn thoại]'; }
          else if (/call/i.test(all)) { kind = 'call'; text = '[Cuộc gọi]'; }
          else { kind = 'other'; text = '[Nội dung khác]'; }
        }
      }
      out.push({
        ts, kind, text, hint,
        from: me ? 'me' : (isGroup ? (lastSender || 'unknown') : 'them'),
      });
    }
    return out;
  }, isGroup);
}

// Cuộn khung chat. to: 'top' (nạp tin cũ) | 'nudge' (nhích xuống để Zalo nhận lại sự kiện cuộn) | 'down'
function scrollChat(page, to) {
  return page.evaluate((to) => {
    let el = document.querySelector('#messageViewScroll');
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 5) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) return { moved: false };
    const before = el.scrollTop;
    if (to === 'top') el.scrollTop = 0;
    else if (to === 'nudge') el.scrollTop = 60;
    else el.scrollTop = before + Math.max(100, el.clientHeight * 0.7);
    return { moved: el.scrollTop !== before };
  }, to);
}

// Đọc các tin mới của một hội thoại. sinceTs: mốc tin đã biết (ms); không có thì lấy vài tin cuối.
// incomplete = true khi dừng mà chưa tải được tới mốc (hoặc chưa đủ số tin cần): có thể thiếu tin.
async function readOne(page, t, scanDeadline) {
  const ok = await openConversation(page, t.name, t.uid);
  if (!ok) return { messages: [], error: 'không tìm thấy hội thoại trong danh sách' };
  const all = new Map();
  const grab = async () => {
    for (const m of await extractMessages(page, t.isGroup)) {
      const old = all.get(m.ts);
      if (old && m.from === 'unknown') m.from = old.from; // đừng làm mất tên người gửi đã đọc được
      all.set(m.ts, m);
    }
  };
  await grab();
  const want = t.sinceTs ? 0 : Math.min(Math.max(t.unreadCount || 1, 1), MAX_FIRST);
  const oldest = () => (all.size ? Math.min(...all.keys()) : Infinity);
  const reached = () => (t.sinceTs ? oldest() <= t.sinceTs : all.size >= want);
  // chưa có mốc thì nạp dư một tin để biết người gửi của tin cũ nhất cần lấy
  const enough = () => (t.sinceTs ? reached() : all.size >= want + 1);

  // 1) cuộn lên đầu, CHỜ tới khi có tin cũ hơn xuất hiện, lặp tới khi đủ
  const deadline = Math.min(Date.now() + CHAT_BUDGET_MS, scanDeadline);
  let stalls = 0;
  let scrolled = false;
  while (!enough() && stalls < MAX_STALLS && Date.now() < deadline) {
    const before = oldest();
    // đang ở sẵn đầu khung thì "cuộn lên đầu" không phát sự kiện cuộn: luôn nhích xuống trước
    await scrollChat(page, 'nudge');
    await page.waitForTimeout(150);
    await scrollChat(page, 'top');
    scrolled = true;
    const until = Math.min(Date.now() + LOAD_WAIT_MS, deadline);
    do { await page.waitForTimeout(300); await grab(); } while (oldest() >= before && Date.now() < until);
    stalls = oldest() < before ? 0 : stalls + 1;
  }
  // 2) cuộn dần xuống cuối để gom các tin ở giữa (khung chat có thể chỉ vẽ phần đang nhìn thấy)
  let swept = !scrolled;
  for (let i = 0; !swept && i < MAX_SWEEP; i++) {
    const s = await scrollChat(page, 'down');
    if (s.moved) await page.waitForTimeout(250);
    await grab();
    swept = !s.moved;
  }

  let msgs = [...all.values()].sort((a, b) => a.ts - b.ts);
  msgs = t.sinceTs ? msgs.filter((m) => m.ts > t.sinceTs) : msgs.slice(-want);
  return { messages: msgs, sinceTs: t.sinceTs, incomplete: !reached() || !swept };
}

// targets: [{ key, name, uid, isGroup, sinceTs, unreadCount }]  ->  { [key]: { messages, sinceTs, incomplete, error? } }
async function readChats(page, targets) {
  const res = {};
  const scanDeadline = Date.now() + SCAN_BUDGET_MS;
  for (const t of targets.slice(0, MAX_OPEN)) {
    try { res[t.key] = await readOne(page, t, scanDeadline); }
    catch (e) { res[t.key] = { messages: [], error: String(e.message || e).split('\n')[0] }; }
  }
  for (const t of targets.slice(MAX_OPEN)) res[t.key] = { messages: [], error: `vượt giới hạn ${MAX_OPEN} hội thoại mỗi lần quét` };
  return res;
}

module.exports = { readChats };
