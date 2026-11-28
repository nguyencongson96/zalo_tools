// Gom hội thoại thành nhóm do người dùng tự đặt (data/groups.json). Một hội thoại có thể thuộc nhiều nhóm.
// Không mở trình duyệt, không đụng tới Zalo. Gom nhóm không thay đổi danh sách theo dõi.
//   node scripts/groups.js list [--ungrouped]   -> liệt kê hội thoại có đánh số (lưu số vào data/group_index.json)
//   node scripts/groups.js show                 -> các nhóm hiện có
//   node scripts/groups.js apply <ops.json>     -> sửa nhóm; sai một thao tác thì không ghi gì
// File ops là một mảng (dùng file để tên tiếng Việt, emoji không bị shell làm hỏng):
//   [ { "group": "Khách hàng", "add": "1-5,9" },        số theo lần "list" gần nhất, hoặc ["Tên A", "Tên B"]
//     { "group": "Khách hàng", "remove": [3] },
//     { "group": "Cũ", "rename": "Mới" },
//     { "group": "Tạm", "delete": true },
//     { "order": ["Khách hàng", "Nội bộ"] } ]          thứ tự tab
const fs = require('fs');
const cfg = require('./config');
const conversations = require('./conversations');
const { readJson, writeJson } = require('./store');

const same = (a, b) => a.trim().toLocaleLowerCase('vi') === b.trim().toLocaleLowerCase('vi');

// groups.json có thể bị sửa tay: bỏ mục sai dạng
function load() {
  const raw = readJson(cfg.groupsFile, []);
  if (!Array.isArray(raw)) throw new Error(`${cfg.groupsFile} phải là một mảng [{ "name", "chats" }].`);
  return raw
    .filter((g) => g && typeof g.name === 'string' && g.name.trim())
    .map((g) => ({ name: g.name.trim(), chats: [...new Set([].concat(g.chats || []).filter((x) => typeof x === 'string' && x))] }));
}

// Tên hội thoại không trùng lặp, theo thứ tự trên Zalo
const chatNames = () => [...new Set(conversations.load().items.map((c) => c.name))];

// "1-5,9" | [1, 2] | ["Tên A"] -> danh sách tên. index: tên theo số đã liệt kê; known: tên có thật
function resolveChats(selector, index, known) {
  const parts = Array.isArray(selector) ? selector : String(selector).split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Chưa chọn hội thoại nào.');
  const out = [];
  const byNumber = (n) => {
    if (!index) throw new Error('Chưa có danh sách đánh số: chạy "node scripts/groups.js list" trước.');
    if (n < 1 || n > index.length) throw new Error(`Số ${n} ngoài danh sách (1-${index.length}).`);
    out.push(index[n - 1]);
  };
  for (const p of parts) {
    if (typeof p === 'number') { if (!Number.isInteger(p)) throw new Error(`Số không hợp lệ: ${p}`); byNumber(p); continue; }
    const range = !Array.isArray(selector) && /^(\d+)(?:\s*-\s*(\d+))?$/.exec(p);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2] || range[1]);
      if (to < from) throw new Error(`Khoảng không hợp lệ: ${p}`);
      for (let n = from; n <= to; n++) byNumber(n);
      continue;
    }
    if (typeof p !== 'string' || !known.has(p)) throw new Error(`Không có hội thoại tên "${p}" (phải khớp đúng từng ký tự).`);
    out.push(p);
  }
  return [...new Set(out)];
}

// Áp các thao tác lên bản sao; trả về { groups, log }. Ném lỗi thì nơi gọi không ghi gì.
function applyOps(current, ops, index, known) {
  if (!Array.isArray(ops) || !ops.length) throw new Error('File thao tác phải là một mảng không rỗng.');
  let groups = current.map((g) => ({ name: g.name, chats: [...g.chats] }));
  const log = [];
  const find = (name) => groups.find((g) => same(g.name, name));
  const need = (name) => { const g = find(name); if (!g) throw new Error(`Không có nhóm "${name}".`); return g; };

  for (const op of ops) {
    if (op && Array.isArray(op.order)) {
      const first = op.order.map(need);
      groups = [...new Set([...first, ...groups])];
      log.push(`Thứ tự tab: ${groups.map((g) => g.name).join(', ')}`);
      continue;
    }
    if (!op || typeof op.group !== 'string' || !op.group.trim()) throw new Error(`Thao tác thiếu "group": ${JSON.stringify(op)}`);
    const actions = ['add', 'remove', 'rename', 'delete'].filter((k) => op[k] !== undefined);
    if (actions.length !== 1) throw new Error(`Mỗi thao tác cần đúng một trong add/remove/rename/delete: ${JSON.stringify(op)}`);

    if (actions[0] === 'add') {
      const names = resolveChats(op.add, index, known);
      let g = find(op.group);
      if (!g) { g = { name: op.group.trim(), chats: [] }; groups.push(g); log.push(`Tạo nhóm "${g.name}"`); }
      const added = names.filter((n) => !g.chats.includes(n));
      g.chats.push(...added);
      log.push(`"${g.name}": thêm ${added.length} (${added.join(' | ') || 'đã có sẵn'})`);
    } else if (actions[0] === 'remove') {
      const g = need(op.group);
      const names = resolveChats(op.remove, index, new Set([...known, ...g.chats]));
      const removed = names.filter((n) => g.chats.includes(n));
      g.chats = g.chats.filter((n) => !removed.includes(n));
      log.push(`"${g.name}": bỏ ${removed.length} (${removed.join(' | ') || 'không có trong nhóm'})`);
    } else if (actions[0] === 'rename') {
      const g = need(op.group);
      const next = String(op.rename).trim();
      if (!next) throw new Error('Tên nhóm mới không được rỗng.');
      if (find(next) && find(next) !== g) throw new Error(`Đã có nhóm "${next}".`);
      log.push(`Đổi tên "${g.name}" -> "${next}"`);
      g.name = next;
    } else {
      if (op.delete !== true) throw new Error('"delete" phải là true.');
      const g = need(op.group);
      groups = groups.filter((x) => x !== g);
      log.push(`Xóa nhóm "${g.name}" (hội thoại không bị ảnh hưởng)`);
    }
  }
  return { groups, log };
}

function list(onlyUngrouped) {
  const data = conversations.load();
  const names = chatNames();
  if (!names.length) throw new Error('Chưa có danh sách hội thoại: chạy "node scripts/check.js --list" trước.');
  const groups = load();
  writeJson(cfg.groupIndexFile, { createdAt: new Date().toISOString(), names });
  const byName = new Map();
  for (const c of data.items) if (!byName.has(c.name)) byName.set(c.name, c);
  const tagsOf = (n) => groups.filter((g) => g.chats.includes(n)).map((g) => g.name);
  const ungrouped = names.filter((n) => !tagsOf(n).length);
  const nGroup = names.filter((n) => byName.get(n).isGroup).length;
  console.log(`Tổng ${names.length} hội thoại: ${nGroup} nhóm chat, ${names.length - nGroup} chat riêng. Chưa phân nhóm: ${ungrouped.length}.`);
  console.log(`Quét lúc: ${data.scannedAt || 'không rõ'}`);
  names.forEach((n, i) => {
    const tags = tagsOf(n);
    if (onlyUngrouped && tags.length) return;
    console.log(`${i + 1}. [${byName.get(n).isGroup ? 'Nhóm' : 'Riêng'}] ${n}${tags.length ? `  -> ${tags.join(', ')}` : ''}`);
  });
}

function show() {
  const groups = load();
  if (!groups.length) return console.log('Chưa có nhóm nào.');
  for (const g of groups) {
    console.log(`${g.name} (${g.chats.length})`);
    g.chats.forEach((n) => console.log(`  - ${n}`));
  }
}

function apply(file) {
  if (!file) throw new Error('Cách dùng: node scripts/groups.js apply <ops.json>');
  const ops = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const snapshot = readJson(cfg.groupIndexFile, null);
  const { groups, log } = applyOps(load(), ops, snapshot && snapshot.names, new Set(chatNames()));
  writeJson(cfg.groupsFile, groups);
  log.forEach((l) => console.log(l));
  console.log(`Đã lưu ${groups.length} nhóm vào ${cfg.groupsFile}`);
}

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === 'list' && args.every((a) => a === '--ungrouped')) list(args.length > 0);
    else if (cmd === 'show' && !args.length) show();
    else if (cmd === 'apply' && args.length <= 1) apply(args[0]);
    else throw new Error('Cách dùng: node scripts/groups.js list [--ungrouped] | show | apply <ops.json>');
  } catch (e) {
    console.error(`LỖI: ${e.message}`);
    process.exitCode = 1;
  }
}

module.exports = { load, applyOps, resolveChats };
