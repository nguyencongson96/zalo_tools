// Chạy 1 lần: mở Zalo Web, quét QR, đóng cửa sổ khi đã vào được danh sách chat.
const { chromium } = require('playwright-core');
const cfg = require('./config');

(async () => {
  const ctx = await chromium.launchPersistentContext(cfg.profileDir, {
    channel: cfg.channel,
    headless: false,
    viewport: { width: 1280, height: 800 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(cfg.url);
  console.log('Quét QR trên cửa sổ vừa mở. Xong thì ĐÓNG cửa sổ trình duyệt để lưu phiên.');
  await new Promise((r) => ctx.on('close', r));
  console.log('Đã lưu phiên vào', cfg.profileDir);
})();
