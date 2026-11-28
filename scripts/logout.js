// Đăng xuất cục bộ + dọn dữ liệu của tài khoản Zalo hiện tại.
//   node scripts/logout.js                 -> chỉ LIỆT KÊ sẽ xóa gì (dry run, không xóa)
//   node scripts/logout.js --yes           -> gỡ tác vụ tự động rồi xóa phiên đăng nhập + dữ liệu theo dõi
//   node scripts/logout.js --yes --keep-config  -> giữ lại watchlist.json, me.json, groups.json (cấu hình người dùng)
// Chỉ xóa bên trong data/. Không động tới mã nguồn, src/, dist/, node_modules, .claude. Không mở trình duyệt.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const cfg = require('./config');

const yes = process.argv.includes('--yes');
const keepConfig = process.argv.includes('--keep-config');
const root = cfg.root;

const targets = [
  { p: cfg.profileDir, what: 'phiên đăng nhập (data/profile/)' },
  { p: cfg.stateFile, what: 'trạng thái lần quét trước (data/state.json)' },
  { p: cfg.logDir, what: 'nhật ký (data/log/)' },
  { p: cfg.trackingDir, what: 'dữ liệu theo dõi và báo cáo (data/tracking/)' },
  { p: cfg.conversationsFile, what: 'danh sách hội thoại (data/conversations.json)' },
  { p: cfg.groupIndexFile, what: 'số thứ tự khi gom nhóm (data/group_index.json)' },
];
if (!keepConfig) {
  targets.push({ p: cfg.watchlistFile, what: 'danh sách theo dõi (data/watchlist.json)' });
  targets.push({ p: cfg.meFile, what: 'thông tin cá nhân (data/me.json)' });
  targets.push({ p: cfg.groupsFile, what: 'nhóm hội thoại (data/groups.json)' });
}

// Chốt an toàn: chỉ được xóa thứ nằm TRONG data/. Mã nguồn, src/, .claude/ ... không bao giờ bị đụng tới.
const inData = (p) => { const r = path.relative(cfg.dataDir, p); return r && !r.startsWith("..") && !path.isAbsolute(r); };
for (const t of targets) if (!inData(t.p)) { console.error("Từ chối: đường dẫn nằm ngoài data/:", t.p); process.exit(1); }
const present = targets.filter((t) => fs.existsSync(t.p));
console.log(yes ? 'ĐĂNG XUẤT + DỌN DỮ LIỆU' : 'DRY RUN (thêm --yes để xóa thật)');
if (!present.length) console.log('Không có dữ liệu nào để xóa.');
for (const t of present) console.log(`  - ${path.relative(root, t.p) || t.p}: ${t.what}`);
if (!yes) process.exit(0);

// 1) Gỡ tác vụ tự động trước, để không có lần quét nào chạy giữa lúc đang xóa
const sched = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
  path.join(__dirname, 'schedule.ps1'), '-Action', 'remove', '-Target', 'all'], { encoding: 'utf8' });
process.stdout.write(sched.stdout || '');
if (sched.status !== 0) console.error('Cảnh báo: không gỡ được tác vụ tự động:', (sched.stderr || '').trim());

// 2) Xóa dữ liệu
let failed = 0;
for (const t of present) {
  try {
    fs.rmSync(t.p, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    console.log(`Đã xóa ${path.relative(root, t.p)}`);
  } catch (e) {
    failed++;
    console.error(`KHÔNG xóa được ${path.relative(root, t.p)}: ${e.code || e.message} (đóng cửa sổ Edge của login.js/check.js rồi chạy lại)`);
  }
}
console.log(failed ? `Xong, còn ${failed} mục chưa xóa được.` : 'Xong. Chạy login.js để đăng nhập tài khoản khác.');
console.log('Lưu ý: thiết bị này vẫn có thể hiện trong danh sách thiết bị đăng nhập của Zalo trên điện thoại; hãy đăng xuất ở đó nếu cần.');
process.exitCode = failed ? 1 : 0;
