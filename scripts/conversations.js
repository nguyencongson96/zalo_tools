// Danh sách MỌI hội thoại thấy trên Zalo (data/conversations.json), dùng để gom nhóm và hiển thị giao diện.
// Chỉ lấy từ danh sách hội thoại, không cần mở hội thoại nào.
const cfg = require('./config');
const { readJson, writeJson } = require('./store');

const load = () => readJson(cfg.conversationsFile, { scannedAt: null, items: [] });

// Hội thoại vừa quét đứng trước, theo đúng thứ tự trên Zalo. Mục cũ không thấy lần này được giữ lại ở cuối
// (danh sách virtualized có thể thiếu hàng), trừ khi đã có hàng cùng tên (ảnh đại diện đổi làm uid đổi).
function save(rows, nowIso) {
  const seen = new Set(rows.map((r) => r.name));
  const items = rows.filter((r) => r.name).map((r) => ({
    name: r.name, uid: r.uid, isGroup: !!r.isGroup, preview: r.preview,
    unread: !!r.unread, unreadCount: r.unreadCount || 0, muted: !!r.muted, pinned: !!r.pinned, seenAt: nowIso,
  }));
  const kept = load().items.filter((c) => !seen.has(c.name));
  writeJson(cfg.conversationsFile, { scannedAt: nowIso, items: [...items, ...kept] });
  return items.length;
}

module.exports = { load, save };
