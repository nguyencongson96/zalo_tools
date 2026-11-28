// Server cục bộ cho giao diện theo dõi: phục vụ app React đã build (dist/) và dữ liệu trong data/.
//   node scripts/server.js [--open]     (cổng mặc định 4780, đổi bằng biến ZALO_UI_PORT)
// CHỈ ĐỌC, chỉ nghe 127.0.0.1: không ghi file, không mở trình duyệt Zalo, không đụng data/profile/.
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const cfg = require('./config');
const { buildDashboard } = require('./view');

const APP_ID = 'zalo_tools';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  // antd chèn style nội tuyến nên cần 'unsafe-inline' cho style; script chỉ lấy từ chính server này
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; "
    + "frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

function send(res, status, type, body, cache = 'no-store') {
  res.writeHead(status, { ...SECURITY, 'Content-Type': type, 'Cache-Control': cache, 'Content-Length': Buffer.byteLength(body) });
  res.end(res.req.method === 'HEAD' ? undefined : body);
}
const sendJson = (res, status, data) => send(res, status, TYPES['.json'], JSON.stringify(data));

function createServer(port, distDir = cfg.uiDistDir) {
  return http.createServer((req, res) => {
    // chặn DNS rebinding: trang web lạ trỏ tên miền của nó về 127.0.0.1 sẽ gửi Host khác
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return sendJson(res, 403, { error: 'Host không hợp lệ' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Chỉ hỗ trợ đọc' });

    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { return sendJson(res, 400, { error: 'Đường dẫn không hợp lệ' }); }

    if (pathname === '/api/health') return sendJson(res, 200, { app: APP_ID });
    if (pathname === '/api/dashboard') {
      try { return sendJson(res, 200, buildDashboard()); }
      catch (e) { console.error(e.message); return sendJson(res, 500, { error: e.message }); }
    }
    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Không có API này' });

    let file = path.join(distDir, pathname);
    const rel = path.relative(distDir, file);
    if (rel.startsWith('..') || path.isAbsolute(rel) || pathname.includes('\0')) return sendJson(res, 404, { error: 'Không tìm thấy' });
    if (!path.extname(file)) file = path.join(distDir, 'index.html'); // route của React
    fs.readFile(file, (err, body) => {
      if (err) return sendJson(res, 404, { error: 'Không tìm thấy' });
      // file trong assets/ có mã băm trong tên nên cache được lâu
      const cache = rel.startsWith(`assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-store';
      send(res, 200, TYPES[path.extname(file)] || 'application/octet-stream', body, cache);
    });
  });
}

function openBrowser(url) {
  spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
}

// Cổng đã bận: nếu chính là giao diện này đang chạy thì chỉ cần mở trình duyệt
function isOurs(port) {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 2000 }, (r) => {
      let s = '';
      r.on('data', (d) => { s += d; });
      r.on('end', () => { try { resolve(JSON.parse(s).app === APP_ID); } catch { resolve(false); } });
    }).on('error', () => resolve(false)).on('timeout', function () { this.destroy(); });
  });
}

if (require.main === module) {
  const open = process.argv.includes('--open');
  const port = cfg.uiPort;
  const url = `http://127.0.0.1:${port}/`;
  if (!fs.existsSync(path.join(cfg.uiDistDir, 'index.html'))) {
    console.error('Chưa build giao diện. Chạy: npm install && npm run build');
    process.exit(1);
  }
  const server = createServer(port);
  server.on('error', async (e) => {
    if (e.code === 'EADDRINUSE' && await isOurs(port)) {
      console.log(`Giao diện đang chạy sẵn: ${url}`);
      if (open) openBrowser(url);
      return;
    }
    console.error(`Không mở được cổng ${port}: ${e.message}. Đặt biến ZALO_UI_PORT để đổi cổng.`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Giao diện theo dõi Zalo: ${url}  (Ctrl+C để dừng)`);
    if (open) openBrowser(url);
  });
}

module.exports = { createServer };
