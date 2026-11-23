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
const MAX_OPEN = 25;        // tối đa số hội thoại mở trong một lần quét
const MAX_FIRST = 30;       // lần đầu (chưa có mốc): chỉ lấy tối đa N tin cuối
const MAX_SCROLLS = 12;     // số lần cuộn lên để nạp tin cũ

async function listScroll(page, to) {
  return page.evaluate((to) => {
    let el = document.querySelector('#conversationList');
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 5) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) return { ok: false, moved: false };
    const before = el.scrollTop;
    el.scrollTop = to === 'top' ? 0 : before + Math.max(200, el.clientHeight * 0.6);
    return { ok: true, moved: el.scrollTop !== before };
  }, to);
}

// Tìm hàng đúng TÊN (khớp chính xác) trong danh sách và bấm vào. Trả về true nếu mở đúng hội thoại.
async function openConversation(page, name, uid) {
  await listScroll(page, 'top');
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
    const s = await listScroll(page, 'down');
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
      if (!text) {
        if (it.querySelector('.sticker-message')) { kind = 'sticker'; text = '[Sticker]'; }
        else if (it.querySelector('.photo-message-v2, .img-msg-v2')) { kind = 'photo'; text = '[Hình ảnh]'; }
        else { kind = 'other'; text = '[Tệp hoặc nội dung khác]'; }
      }
      out.push({
        ts, kind, text,
        from: me ? 'me' : (isGroup ? (lastSender || 'unknown') : 'them'),
      });
    }
    return out;
  }, isGroup);
}

// Cuộn khung chat lên đầu để nạp tin cũ hơn; trả về false nếu không còn gì để nạp
function scrollChatUp(page) {
  return page.evaluate(() => {
    let el = document.querySelector('#messageViewScroll');
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 5) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) return false;
    const before = el.scrollTop;
    el.scrollTop = 0;
    return before > 0;
  });
}

// Đọc các tin mới của một hội thoại. sinceTs: mốc tin đã biết (ms); không có thì lấy vài tin cuối.
async function readOne(page, t) {
  const ok = await openConversation(page, t.name, t.uid);
  if (!ok) return { messages: [], error: 'không tìm thấy hội thoại trong danh sách' };
  const all = new Map();
  const merge = (arr) => arr.forEach((m) => all.set(m.ts, m));
  merge(await extractMessages(page, t.isGroup));
  const want = t.sinceTs ? 0 : Math.max(t.unreadCount || 1, 1);
  for (let i = 0; i < MAX_SCROLLS; i++) {
    const min = Math.min(...all.keys());
    if (t.sinceTs ? min <= t.sinceTs : all.size >= Math.min(want, MAX_FIRST) + 1) break;
    const could = await scrollChatUp(page);
    await page.waitForTimeout(900);
    const before = all.size;
    merge(await extractMessages(page, t.isGroup));
    if (!could && all.size === before) break;
    if (all.size === before && i > 1) break;
  }
  let msgs = [...all.values()].sort((a, b) => a.ts - b.ts);
  msgs = t.sinceTs ? msgs.filter((m) => m.ts > t.sinceTs) : msgs.slice(-Math.min(want, MAX_FIRST));
  return { messages: msgs };
}

// targets: [{ key, name, uid, isGroup, sinceTs, unreadCount }]  ->  { [key]: { messages, error? } }
async function readChats(page, targets) {
  const res = {};
  for (const t of targets.slice(0, MAX_OPEN)) {
    try { res[t.key] = await readOne(page, t); }
    catch (e) { res[t.key] = { messages: [], error: String(e.message || e).split('\n')[0] }; }
  }
  for (const t of targets.slice(MAX_OPEN)) res[t.key] = { messages: [], error: `vượt giới hạn ${MAX_OPEN} hội thoại mỗi lần quét` };
  return res;
}

module.exports = { readChats };
