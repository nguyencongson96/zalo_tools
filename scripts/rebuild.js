// Dựng lại data/tracking/index.html từ dữ liệu có sẵn và scripts/template.html (KHÔNG quét Zalo, không mở trình duyệt).
// Dùng sau khi sửa template.html, hoặc khi muốn làm mới trang mà không cần quét.
//   node scripts/rebuild.js
const tracking = require('./tracking');
const r = tracking.rebuild();
console.log(`Đã dựng lại data/tracking/index.html: ${r.count} đối tượng, ${r.unread} chưa đọc`);
