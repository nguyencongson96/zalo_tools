// Cấu hình dùng chung cho các script Zalo Web
const path = require('path');

const root = path.join(__dirname, '..');   // gốc project
const dataDir = path.join(root, 'data');   // toàn bộ dữ liệu cá nhân (đã .gitignore)

module.exports = {
  url: 'https://chat.zalo.me/',
  channel: 'msedge',                                  // dùng Edge có sẵn, không cần tải browser
  root,
  dataDir,
  profileDir: path.join(dataDir, 'profile'),          // phiên đăng nhập được giữ ở đây
  stateFile: path.join(dataDir, 'state.json'),        // trạng thái lần quét trước
  logDir: path.join(dataDir, 'log'),
  trackingDir: path.join(dataDir, 'tracking'),        // bảng theo dõi + báo cáo cho người đọc
  watchlistFile: path.join(dataDir, 'watchlist.json'),// ["Tên A", "Tên B"]
  meFile: path.join(dataDir, 'me.json'),              // { aliases, keywords }
};
