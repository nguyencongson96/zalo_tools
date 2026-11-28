// Đọc/ghi file dữ liệu dùng chung, tránh mất dữ liệu.
//   readJson(f, d)  - chỉ trả d khi file CHƯA TỒN TẠI; file hỏng hoặc không đọc được thì báo lỗi (không ghi đè mất dữ liệu)
//   writeJson(f, o) - ghi qua file tạm rồi đổi tên: bị ngắt giữa chừng thì file cũ vẫn nguyên
const fs = require('fs');

function readJson(file, def) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return def; throw e; }
  try { return JSON.parse(raw.replace(/^﻿/, '')); }   // Notepad / PowerShell hay thêm BOM
  catch (e) { throw new Error(`File JSON hỏng: ${file} (${e.message}). Sửa hoặc xóa file này rồi chạy lại.`); }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, file); return; }
    catch (e) {
      // Windows: file đích có thể đang bị chương trình khác (antivirus, trình soạn thảo) giữ trong chốc lát
      if (i >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(e.code)) { fs.rmSync(tmp, { force: true }); throw e; }
      sleep(200);
    }
  }
}

module.exports = { readJson, writeJson };
