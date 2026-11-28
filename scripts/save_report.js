// Lưu báo cáo (Markdown do Claude viết) vào data/tracking/.reports.json (hiện ở trang "Báo cáo" của giao diện).
//   node scripts/save_report.js <yyyy-MM-dd> <file-markdown-đầu-vào>
// Báo cáo cùng ngày được ghi đè. Không quét Zalo.
const fs = require('fs');
const tracking = require('./tracking');

const [date, input] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !input) {
  console.error('Cách dùng: node scripts/save_report.js <yyyy-MM-dd> <file-markdown>');
  process.exit(1);
}
const md = fs.readFileSync(input, 'utf8');
if (!md.trim()) { console.error('Báo cáo rỗng, không lưu.'); process.exit(1); }
tracking.saveReport(date, md);
console.log(`Đã lưu báo cáo ${date}. Xem ở trang "Báo cáo" của giao diện (npm run ui).`);
