// Dữ liệu theo dõi của các hội thoại trong watchlist (không dựng giao diện: xem scripts/view.js và src/).
//   data/tracking/.data.json     - trạng thái + lịch sử từng đối tượng
//   data/tracking/.reports.json  - báo cáo dạng Markdown theo ngày: { "yyyy-MM-dd": "..." }
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { readJson, writeJson } = require('./store');

const DIR = cfg.trackingDir;
const DATA = path.join(DIR, '.data.json');
const REPORTS = path.join(DIR, '.reports.json');
const HISTORY_MAX = 200;
const RECENT_MS = 24 * 3600 * 1000;   // "tin mới" = tin của người khác trong 24 giờ gần nhất
const REPORTS_MAX = 60;

// Tách người gửi khỏi dòng xem trước: "Bạn: ..." | "Tên: ..." (nhóm) | không tiền tố (chat 1-1 của người kia)
function parsePreview(preview, isGroup) {
  if (/^Bạn:\s*/.test(preview)) return { from: 'me', text: preview.replace(/^Bạn:\s*/, '') };
  const m = /^([^:]{1,40}):\s+([\s\S]*)$/.exec(preview);
  if (isGroup && m) return { from: m[1].trim(), text: m[2] };
  return { from: isGroup ? 'unknown' : 'them', text: preview };
}

// Đánh giá "liên quan đến tôi" bằng quy tắc (không phải AI). Cấu hình ở data/me.json.
function relevance({ isGroup, from, text }, me) {
  if (from === 'me') return { level: 'no', why: 'Bạn là người nhắn' };
  const hay = text.toLowerCase();
  const aliases = strList(me && me.aliases);
  const alias = aliases.find((a) => hay.includes(a.toLowerCase()));
  if (alias) return { level: 'yes', why: `nhắc tên "${alias}"` };
  const kw = strList(me && me.keywords).find((k) => hay.includes(k.toLowerCase()));
  if (kw) return { level: 'yes', why: `có từ khóa "${kw}"` };
  if (!isGroup) return { level: 'yes', why: 'tin nhắn riêng gửi cho bạn' };
  if (!aliases.length) return { level: 'unknown', why: 'nhóm chat, chưa khai tên trong me.json' };
  return { level: 'no', why: 'tin nhóm, không nhắc đến bạn' };
}
// me.json do người dùng sửa tay: chấp nhận cả một chuỗi đơn ("aliases": "Son") lẫn mảng
const strList = (v) => [].concat(v || []).filter((x) => typeof x === 'string' && x);
// tin của NGƯỜI KHÁC trong 24 giờ gần nhất (công cụ tự mở hội thoại nên "chưa đọc" của Zalo không còn ý nghĩa)
function recentOf(e, now = Date.now()) {
  const msgs = e.history.filter((h) => h.type === "msg" && h.from !== "me" && now - new Date(h.at).getTime() <= RECENT_MS);
  return { n: msgs.length, rel: msgs.filter((h) => h.rel === "yes").length };
}

// Lưu báo cáo (Markdown) vào kho
function saveReport(date, markdown) {
  fs.mkdirSync(DIR, { recursive: true });
  const reports = readJson(REPORTS, {});
  reports[date] = String(markdown).replace(/^\uFEFF/, '').trim();
  const out = {};
  for (const k of Object.keys(reports).sort().reverse().slice(0, REPORTS_MAX).sort()) out[k] = reports[k];
  writeJson(REPORTS, out);
}

// Đọc thử kho dữ liệu; ném lỗi nếu file hỏng (check.js gọi trước khi mở hội thoại)
function preflight() {
  readJson(DATA, {});
  readJson(REPORTS, {});
}

function update({ rows, watchNames, me, events, nowIso }) {
  fs.mkdirSync(DIR, { recursive: true });
  const data = readJson(DATA, {});
  const watched = new Set(watchNames);

  for (const r of rows) {
    if (!watched.has(r.name)) continue;
    const key = `${r.name}|${r.uid}`;
    const isGroup = !!r.isGroup;
    const e = data[key] || { name: r.name, uid: r.uid, isGroup, history: [], firstSeen: nowIso };
    const p = parsePreview(r.preview, isGroup);
    const rel = relevance({ isGroup, ...p }, me);

    const cap = events.chats && events.chats[key];
    const isNew = events.fresh.some((f) => f.name === r.name && f.uid === r.uid);
    const readEv = events.reads.find((x) => x.name === r.name && x.uid === r.uid);
    let full = null;   // tin đầy đủ vừa đọc được bằng cách mở hội thoại
    if (cap && cap.messages) {
      const have = new Set(e.history.map((h) => h.id).filter(Boolean));
      full = cap.messages.filter((m) => !have.has(m.ts)).map((m) => {
        const rl = relevance({ isGroup, from: m.from, text: m.text }, me);
        return { at: new Date(m.ts).toISOString(), type: "msg", id: m.ts, from: m.from, text: m.text, kind: m.kind, rel: rl.level, why: rl.why };
      });
      e.history = [...full.reverse(), ...e.history];   // mới nhất lên đầu
      // đánh dấu khoảng có thể thiếu tin; đọc lại được tới mốc thì gỡ dấu
      if (!cap.incomplete) {
        e.history = e.history.filter((h) => !(h.type === 'gap' && cap.sinceTs && h.since >= cap.sinceTs));
      } else if (cap.messages.length) {
        const since = cap.sinceTs || 0;
        const to = cap.messages[0].ts;
        // lần đọc lại xuống sâu hơn: dấu cũ phía trên đã được lấp một phần, thay bằng dấu mới
        e.history = e.history.filter((h) => !(h.type === 'gap' && h.since === since && h.to > to));
        // tin cũ nhất lần này đã lưu từ trước = nối vào đoạn cũ, dấu cũ (nếu có) vẫn đúng chỗ
        if (!have.has(to)) {
          e.history.push({ type: 'gap', at: new Date(to - 1).toISOString(), since, to });   // nằm ngay dưới tin cũ nhất đọc được
        }
      }
      e.history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      if (cap.messages.length) {
        const top = cap.messages[cap.messages.length - 1];
        e.lastChange = new Date(top.ts).toISOString();
        e.lastMsgTs = top.ts;
        const trl = relevance({ isGroup, from: top.from, text: top.text }, me);
        e.last = { from: top.from, text: top.text, rel: trl.level, why: trl.why };
      }
    } else if (isNew) {
      e.history.unshift({ at: nowIso, type: 'msg', from: p.from, text: p.text, truncated: /\.\.\.$|…$/.test(r.preview),
                          unread: r.unread, rel: rel.level, why: rel.why });
      e.lastChange = nowIso;
    }
    if (readEv) {
      e.history.unshift({ at: nowIso, type: 'read', waitedMin: readEv.waitedMin });
      e.lastRead = nowIso;
    }
    e.history = e.history.slice(0, HISTORY_MAX);
    Object.assign(e, { name: r.name, uid: r.uid, isGroup, observedAt: nowIso, inList: true,
                       unread: full ? false : r.unread, unreadCount: full ? 0 : r.unreadCount, muted: r.muted });
    if (!full || !e.last) e.last = { from: p.from, text: p.text, rel: rel.level, why: rel.why };
    data[key] = e;
  }
  // đối tượng không có trong lần quét này (cuộn ra ngoài vùng hiển thị): giữ dữ liệu cũ
  const seenKeys = new Set(rows.map((r) => `${r.name}|${r.uid}`));
  for (const [k, e] of Object.entries(data)) if (!seenKeys.has(k)) e.inList = false;
  writeJson(DATA, data);

  // dọn trang tĩnh của phiên bản cũ (nay giao diện là app React, đọc dữ liệu qua scripts/server.js)
  for (const f of fs.readdirSync(DIR)) {
    if (f.endsWith('.md') || f.endsWith('.html')) fs.unlinkSync(path.join(DIR, f));
  }
  const items = Object.values(data).filter((e) => watched.has(e.name));
  const missing = [...watched].filter((n) => !items.some((e) => e.name === n));
  return { count: items.length + missing.length, unread: items.reduce((a, e) => a + recentOf(e).n, 0) };
}

module.exports = { update, saveReport, preflight, recentOf, DATA, REPORTS };
