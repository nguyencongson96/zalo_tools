// Sinh MỘT file HTML duy nhất cho người dùng mở bằng trình duyệt: data/tracking/index.html
//   - tab "Theo dõi": danh sách đối tượng, tìm kiếm/lọc, bấm vào từng dòng để xem lịch sử
//   - tab "Báo cáo" : các báo cáo cuối ngày (nhúng ngay trong trang)
// Dữ liệu gốc (script đọc/ghi, người dùng không cần mở):
//   data/tracking/.data.json     - trạng thái + lịch sử từng đối tượng
//   data/tracking/.reports.json  - báo cáo dạng Markdown theo ngày: { "yyyy-MM-dd": "..." }
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { esc, page, mdToHtml } = require('./render');

const DIR = cfg.trackingDir;
const DATA = path.join(DIR, '.data.json');
const REPORTS = path.join(DIR, '.reports.json');
const HISTORY_MAX = 200;
const RECENT_MS = 24 * 3600 * 1000;   // "tin mới" = tin của người khác trong 24 giờ gần nhất
const REPORTS_MAX = 60;

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const p2 = (n) => String(n).padStart(2, '0');
const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 7);
const initial = (name) => {
  const m = /[\p{L}\p{N}]/u.exec(String(name));
  return (m ? m[0] : '?').toUpperCase();
};

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
  const alias = (me.aliases || []).find((a) => a && hay.includes(a.toLowerCase()));
  if (alias) return { level: 'yes', why: `nhắc tên "${alias}"` };
  const kw = (me.keywords || []).find((k) => k && hay.includes(k.toLowerCase()));
  if (kw) return { level: 'yes', why: `có từ khóa "${kw}"` };
  if (!isGroup) return { level: 'yes', why: 'tin nhắn riêng gửi cho bạn' };
  if (!(me.aliases || []).length) return { level: 'unknown', why: 'nhóm chat, chưa khai tên trong me.json' };
  return { level: 'no', why: 'tin nhóm, không nhắc đến bạn' };
}
const senderLabel = (from) => (from === 'me' ? 'Bạn' : from);

// ---------- dựng HTML ----------
const REL = { yes: ['grn', 'Liên quan đến bạn'], unknown: ['amb', 'Chưa rõ'], no: ['gray', 'Không liên quan'] };
const relBadge = (rel, full) => {
  const r = REL[rel];
  return r && (full || rel !== 'no') ? `<span class="b ${r[0]}">${r[1]}</span>` : '';
};

// tin của NGƯỜI KHÁC trong 24 giờ gần nhất (công cụ tự mở hội thoại nên "chưa đọc" của Zalo không còn ý nghĩa)
function recentOf(e, now = Date.now()) {
  const msgs = e.history.filter((h) => h.type === "msg" && h.from !== "me" && now - new Date(h.at).getTime() <= RECENT_MS);
  return { n: msgs.length, rel: msgs.filter((h) => h.rel === "yes").length };
}

function itemHtml(e) {
  const rc = recentOf(e);
  const who = e.last && e.last.from !== 'them' && e.last.from !== 'unknown' ? `<b>${esc(senderLabel(e.last.from))}:</b> ` : '';
  const snip = e.last ? who + esc(e.last.text) : '<i>Chưa có dữ liệu</i>';
  const history = e.history.length
    ? `<ul class="tl">${e.history.map((h) => h.type === 'read'
      ? `<li class="rd"><div class="when">${fmt(h.at)}</div><span class="who">Bạn đã đọc</span>${h.waitedMin != null ? ` <span class="muted">sau ${h.waitedMin} phút</span>` : ''}</li>`
      : `<li${h.from === 'me' ? ' class="mine"' : ''}><div class="when">${fmt(h.at)}${h.rel && h.from !== 'me' ? ' · ' + relBadge(h.rel, true) : ''}</div><span class="who">${esc(h.from === 'them' ? e.name : senderLabel(h.from))}</span>: <span class="txt">${esc(h.text)}</span>${h.truncated ? ' <span class="muted">(bị rút gọn)</span>' : ''}</li>`).join('')}</ul>`
    : '<p class="muted">Chưa ghi nhận tin mới nào kể từ khi bắt đầu theo dõi.</p>';
  return `<details class="item${rc.rel ? ' hot' : ''}" data-name="${esc(e.name.toLowerCase())}" data-new="${rc.n ? 1 : 0}" data-rel="${rc.rel ? 'yes' : ''}">
<summary>
<div class="av" style="--h:${hue(e.name)}">${esc(initial(e.name))}</div>
<div><div class="nm">${esc(e.name)}<span class="t">${e.isGroup ? 'Nhóm' : 'Riêng'}</span></div><div class="snip">${snip}</div></div>
<div class="meta"><div class="badges">${e.unread ? `<span class="b red">${e.unreadCount} chưa đọc</span>` : ''}${rc.n ? `<span class="b blue">${rc.n} tin mới</span>` : ''}${rc.rel ? `<span class="b grn">${rc.rel} liên quan</span>` : ''}</div><time>${fmt(e.lastChange || e.observedAt)}</time></div>
</summary>
<div class="detail">
<dl class="facts">
<dt>Tin mới (24 giờ)</dt><dd>${rc.n} tin từ người khác, trong đó ${rc.rel} tin liên quan đến bạn${e.unread ? ` · <b>Zalo còn ${e.unreadCount} tin chưa đọc</b>` : ''}${e.muted ? ' · đã tắt thông báo' : ''}</dd>
${e.last ? `<dt>Đánh giá</dt><dd>${relBadge(e.last.rel, true)} <span class="muted">${esc(e.last.why)}</span></dd>` : ''}
<dt>Lần đọc gần nhất</dt><dd>${fmt(e.lastRead)}</dd>
<dt>Quét lúc</dt><dd>${fmt(e.observedAt)}${e.inList ? '' : ' <span class="muted">(lần quét gần nhất không thấy hội thoại này)</span>'}</dd>
</dl>
<h3>Lịch sử</h3>
${history}
</div>
</details>`;
}

// Dựng lại index.html từ .data.json + .reports.json (không cần quét Zalo)
function rebuild({ watchNames, nowIso } = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  const watched = new Set(watchNames || readJson(cfg.watchlistFile, []));
  const data = readJson(DATA, {});
  const reports = readJson(REPORTS, {});
  const items = Object.values(data).filter((e) => watched.has(e.name));
  const byName = new Map(items.map((e) => [e.name, e]));
  const missing = [...watched].filter((n) => !byName.has(n));
  items.sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0) || String(b.lastChange || '').localeCompare(String(a.lastChange || '')));

  const total = items.length + missing.length;
  const rcs = items.map((e) => recentOf(e));
  const unreadN = rcs.reduce((a, r) => a + r.n, 0);            // tổng tin mới 24h
  const relN = rcs.reduce((a, r) => a + r.rel, 0);               // tổng tin liên quan 24h
  const updated = nowIso || items.map((e) => e.observedAt).sort().pop();
  const days = Object.keys(reports).sort().reverse();

  const watchPanel = `<div class="toolbar">
<input id="q" type="search" placeholder="Tìm theo tên nhóm / người…" autocomplete="off">
<button class="chip" data-f="all" aria-pressed="true">Tất cả</button>
<button class="chip" data-f="new" aria-pressed="false">Có tin mới (24h)</button>
<button class="chip" data-f="rel" aria-pressed="false">Liên quan đến tôi</button>
</div>
<div class="list">
${items.map(itemHtml).join('\n')}
</div>
<div class="empty" id="none" hidden>Không có đối tượng nào khớp.</div>
${!items.length ? '<div class="empty">Chưa có dữ liệu. Hãy thêm đối tượng vào danh sách theo dõi rồi quét Zalo.</div>' : ''}
${missing.length ? `<p class="note">Chưa có dữ liệu (không nằm trong danh sách Zalo đã tải, sẽ hiện khi có tin mới): ${missing.map(esc).join(', ')}.</p>` : ''}
<p class="note">“Liên quan đến tôi” do script đánh giá bằng quy tắc (chat riêng, nhắc tên, từ khóa trong <code>me.json</code>), chỉ mang tính gợi ý. Nội dung tin lấy từ dòng xem trước của Zalo nên có thể bị rút gọn. Trang tự tải lại mỗi phút khi bạn không mở chi tiết nào.</p>`;

  const reportsPanel = days.length
    ? days.map((d, i) => {
      const [y, mo, da] = d.split('-');
      return `<details class="rep"${i === 0 ? ' open' : ''}><summary><span>Báo cáo ngày ${da}/${mo}/${y}</span></summary><div class="prose">${mdToHtml(reports[d])}</div></details>`;
    }).join('\n')
    : '<div class="empty">Chưa có báo cáo nào. Gõ <code>/zalo_report</code> trong Claude để tạo báo cáo, hoặc bật báo cáo cuối ngày bằng <code>/zalo_schedule</code>.</div>';

  const body = `<header class="top">
<h1>Theo dõi Zalo</h1>
<div class="upd">Cập nhật lúc <b>${fmt(updated)}</b></div>
</header>
<section class="stats">
<div class="stat"><div class="n">${total}</div><div class="l">Đối tượng theo dõi</div></div>
<div class="stat"><div class="n">${unreadN}</div><div class="l">Tin mới trong 24 giờ qua</div></div>
<div class="stat ${relN ? 'alert' : 'ok'}"><div class="n">${relN}</div><div class="l">Tin liên quan đến bạn (24 giờ)</div></div>
</section>
<nav class="tabs">
<button data-tab="watch" aria-selected="true">Theo dõi</button>
<button data-tab="reports" aria-selected="false">Báo cáo<span class="cnt">${days.length}</span></button>
</nav>
<section data-panel="watch">
${watchPanel}
</section>
<section data-panel="reports" hidden>
${reportsPanel}
</section>`;
  fs.writeFileSync(path.join(DIR, 'index.html'), page({ title: 'Theo dõi Zalo', body }));
  return { dir: DIR, count: total, unread: unreadN };
}

// Lưu báo cáo (Markdown) vào kho, rồi dựng lại trang
function saveReport(date, markdown) {
  fs.mkdirSync(DIR, { recursive: true });
  const reports = readJson(REPORTS, {});
  reports[date] = String(markdown).replace(/^\uFEFF/, '').trim();
  const out = {};
  for (const k of Object.keys(reports).sort().reverse().slice(0, REPORTS_MAX).sort()) out[k] = reports[k];
  fs.writeFileSync(REPORTS, JSON.stringify(out, null, 2));
  return rebuild();
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
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));

  // dọn file của phiên bản cũ (mỗi đối tượng một .md/.html): nay chỉ còn index.html
  for (const f of fs.readdirSync(DIR)) {
    if ((f.endsWith('.md') || f.endsWith('.html')) && f !== 'index.html') fs.unlinkSync(path.join(DIR, f));
  }
  return rebuild({ watchNames: [...watched], nowIso });
}

module.exports = { update, rebuild, saveReport };
