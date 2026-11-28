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
  trackingDir: path.join(dataDir, 'tracking'),        // lịch sử theo dõi + báo cáo (JSON)
  watchlistFile: path.join(dataDir, 'watchlist.json'),// ["Tên A", "Tên B"]
  meFile: path.join(dataDir, 'me.json'),              // { aliases, keywords }
  conversationsFile: path.join(dataDir, 'conversations.json'), // mọi hội thoại thấy ở lần quét gần nhất
  groupsFile: path.join(dataDir, 'groups.json'),      // nhóm do người dùng tự đặt: [{ name, chats: [tên] }]
  groupIndexFile: path.join(dataDir, 'group_index.json'), // số thứ tự đã liệt kê cho người dùng khi gom nhóm
  uiDistDir: path.join(root, 'dist'),           // giao diện React đã build
  uiPort: Number(process.env.ZALO_UI_PORT) || 4780,
};
