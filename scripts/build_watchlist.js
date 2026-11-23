// Tạo watchlist.json từ các hội thoại có nhãn (phân loại) khớp LABEL, mặc định "BIDV".
//   node scripts/build_watchlist.js [NHÃN]
// Quét cả tab "Ưu tiên" và "Khác", cuộn hết danh sách (danh sách là virtualized).
// Chỉ đọc; gộp thêm vào watchlist.json hiện có, không xóa tên đã có.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const cfg = require('./config');

const LABEL = (process.argv[2] || 'BIDV').toLowerCase();
const OUT = cfg.watchlistFile;

async function collect(page) {
  const seen = new Map();
  await page.evaluate(() => { const l = document.querySelector('#conversationList'); if (l) l.scrollTop = 0; });
  await page.waitForTimeout(800);
  for (let i = 0; i < 200; i++) {
    const { rows, atEnd } = await page.evaluate(() => {
      const list = document.querySelector('#conversationList');
      const rows = [...document.querySelectorAll('#conversationList .msg-item')].map((row) => ({
        uid: (row.querySelector('[data-ava-uid]') || {}).getAttribute?.('data-ava-uid') || null,
        name: (row.querySelector('.conv-item-title__name') || {}).textContent?.replace(/ /g, ' ').trim() || '',
        labels: [...row.querySelectorAll('.conv__label')].map((e) => e.getAttribute('title') || ''),
      }));
      const before = list.scrollTop;
      list.scrollTop = before + Math.max(200, list.clientHeight * 0.7);
      return { rows, atEnd: list.scrollTop === before };
    });
    for (const r of rows) seen.set(r.name + '|' + r.uid, r); // uid có thể trùng giữa các nhóm
    if (atEnd) break;
    await page.waitForTimeout(400);
  }
  return [...seen.values()];
}

(async () => {
  const ctx = await chromium.launchPersistentContext(cfg.profileDir, {
    channel: cfg.channel, headless: !process.env.HEADED, viewport: { width: 1280, height: 800 },
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#conversationList .msg-item', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dùng bộ lọc "Phân loại" của Zalo: chọn thẻ có tên khớp LABEL
    const openMenu = async () => { await page.getByText('Phân loại', { exact: true }).first().click(); await page.waitForTimeout(800); };
    const labelText = await (async () => {
      await openMenu();
      const names = await page.evaluate(() => [...document.querySelectorAll('div, span')]
        .filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => e.textContent.trim()));
      return names.find((n) => n.toLowerCase() === LABEL);
    })();
    if (!labelText) { console.log('Không tìm thấy thẻ phân loại khớp "' + LABEL + '" trong menu.'); return; }
    await page.getByText(labelText, { exact: true }).first().click();
    await page.waitForTimeout(2000);    console.log('Đã lọc theo thẻ "' + labelText + '"');

    const hitsMap = new Map();
    for (const tab of ['Ưu tiên', 'Khác']) {
      const t = page.getByText(tab, { exact: true }).first();
      if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(1500); }
      try { await page.waitForSelector('#conversationList .msg-item', { timeout: 5000 }); } catch { console.log('Tab "' + tab + '": 0'); continue; }
      const rows = await collect(page);
      console.log('Tab "' + tab + '": ' + rows.length + ' hội thoại');
      for (const r of rows) hitsMap.set(r.name + '|' + r.uid, r);
    }
    const hits = [...hitsMap.values()];
    console.log('Khớp thẻ "' + labelText + '": ' + hits.length);
    hits.forEach((h) => console.log(' -', h.name));

    // Bỏ lọc để trả giao diện về như cũ
    try { await openMenu(); await page.getByText(labelText, { exact: true }).first().click(); } catch {}

    let cur = [];
    try { cur = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
    const merged = [...new Set([...cur, ...hits.map((h) => h.name).filter(Boolean)])];
    fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
    console.log(`Đã ghi ${merged.length} tên vào ${OUT}`);
  } finally {
    await ctx.close();
  }
})();
