// Ghép dữ liệu trong data/ thành một đối tượng cho giao diện (GET /api/dashboard). Chỉ đọc.
// Hình dạng trả về phải khớp src/services/api/dashboard/types.ts.
const cfg = require('./config');
const conversations = require('./conversations');
const groupsStore = require('./groups');
const tracking = require('./tracking');
const { mdToHtml } = require('./markdown');
const { readJson } = require('./store');

function buildDashboard(now = Date.now()) {
  const { scannedAt, items } = conversations.load();
  const data = readJson(tracking.DATA, {});
  const reports = readJson(tracking.REPORTS, {});
  const watched = new Set(readJson(cfg.watchlistFile, []));
  const groups = groupsStore.load();
  const groupsOf = (name) => groups.filter((g) => g.chats.includes(name)).map((g) => g.name);

  const used = new Set();
  // uid đổi (đổi ảnh đại diện) thì khóa không còn khớp: dùng mục cùng tên nếu chỉ có đúng một
  const entryFor = (key, name) => {
    if (data[key]) { used.add(key); return data[key]; }
    if (items.filter((c) => c.name === name).length > 1) return null;
    const same = Object.keys(data).filter((k) => data[k].name === name && !used.has(k));
    if (same.length !== 1) return null;
    used.add(same[0]);
    return data[same[0]];
  };

  const toView = (key, conv, entry) => {
    const name = (conv || entry).name;
    const isWatched = watched.has(name);
    const e = isWatched ? entry : null; // nội dung chi tiết chỉ hiện cho hội thoại đang theo dõi
    const recent = e ? tracking.recentOf(e, now) : { n: 0, rel: 0 };
    return {
      key, name,
      isGroup: !!((conv && conv.isGroup) || (entry && entry.isGroup)),
      watched: isWatched,
      groups: groupsOf(name),
      preview: conv ? conv.preview : '',
      unreadCount: e && e.unread ? e.unreadCount : conv && conv.unread ? conv.unreadCount : 0,
      muted: !!(conv ? conv.muted : entry && entry.muted),
      observedAt: (e && e.observedAt) || (conv && conv.seenAt) || null,
      lastChange: (e && e.lastChange) || null,
      lastMessage: (e && e.last) || null,
      recent: { count: recent.n, related: recent.rel },
      history: (e && e.history) || [],
    };
  };

  const list = items.map((c) => { const key = `${c.name}|${c.uid}`; return toView(key, c, entryFor(key, c.name)); });
  const listed = new Set(list.map((c) => c.name));
  // đang theo dõi nhưng chưa có trong danh sách hội thoại
  for (const [key, e] of Object.entries(data)) {
    if (used.has(key) || listed.has(e.name) || !watched.has(e.name)) continue;
    list.push(toView(key, null, e));
    listed.add(e.name);
  }
  for (const name of watched) if (!listed.has(name)) list.push(toView(`${name}|`, { name, preview: '' }, null));

  const updatedAt = [scannedAt, ...Object.values(data).map((e) => e.observedAt)].filter(Boolean).sort().pop() || null;
  return {
    updatedAt,
    groups,
    conversations: list,
    reports: Object.keys(reports).sort().reverse().map((date) => ({ date, html: mdToHtml(reports[date]) })),
  };
}

module.exports = { buildDashboard };
