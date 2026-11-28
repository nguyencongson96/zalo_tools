// Tạo watchlist.json từ các hội thoại có nhãn (phân loại) khớp LABEL, mặc định "BIDV".
//   node scripts/build_watchlist.js [NHÃN]
// Quét cả tab "Ưu tiên" và "Khác", cuộn hết danh sách (danh sách là virtualized).
// Chỉ đọc; gộp thêm vào watchlist.json hiện có, không xóa tên đã có.
// Chỉ thêm hội thoại thật sự mang nhãn đó, và không bao giờ bấm vào hàng hội thoại hay khung chat.
const { chromium } = require('playwright-core');
const cfg = require('./config');
const { readJson, writeJson } = require('./store');
const { scrollThrough } = require('./list');

const LABEL = (process.argv[2] || 'BIDV').trim().toLowerCase();
const OUT = cfg.watchlistFile;
// vùng KHÔNG được bấm: bấm vào hàng hội thoại sẽ mở nó (Zalo đánh dấu đã đọc, gửi "đã xem")
const CHAT_AREAS = '#conversationList .msg-item, #chatViewContainer';

// Bấm phần tử hiển thị đầu tiên có đúng chữ `text` nằm ngoài CHAT_AREAS; trả về false nếu không có
async function clickOutsideChats(page, text) {
  const found = page.getByText(text, { exact: true });
  const n = await found.count();
  for (let i = 0; i < n; i++) {
    const el = found.nth(i);
    if (!(await el.isVisible())) continue;
    if (await el.evaluate((e, sel) => !!e.closest(sel), CHAT_AREAS)) continue;
    await el.click();
    return true;
  }
  return false;
}

// Đọc các hàng đang được vẽ, kèm nhãn phân loại
function readRows(page) {
  return page.evaluate(() => [...document.querySelectorAll('#conversationList .msg-item')].map((row) => ({
        uid: (row.querySelector('[data-ava-uid]') || {}).getAttribute?.('data-ava-uid') || null,
        name: (row.querySelector('.conv-item-title__name') || {}).textContent?.replace(/ /g, ' ').trim() || '',
    labels: [...row.querySelectorAll('.conv__label')].map((e) => e.getAttribute('title') || ''),
  })));
}

// Cuộn hết danh sách (cách cuộn: scripts/list.js) và gom mọi hàng
async function collect(page) {
  const seen = new Map();
  const grab = async () => {
    for (const r of await readRows(page)) {
      const key = r.name + '|' + r.uid; // uid có thể trùng giữa các nhóm
      const old = seen.get(key);
      if (old) r.labels = [...new Set([...old.labels, ...r.labels])]; // nhãn có thể vẽ chậm hơn hàng
      seen.set(key, r);
    }
    return seen.size;
  };
  if (!(await scrollThrough(page, grab, 400))) console.log('CẢNH BÁO: danh sách quá dài, đã dừng trước khi tới cuối.');
  return [...seen.values()];
}

(async () => {
  const cur = readJson(OUT, []); // đọc trước khi mở trình duyệt: file hỏng thì dừng, không ghi đè
  const ctx = await chromium.launchPersistentContext(cfg.profileDir, {
    channel: cfg.channel, headless: !process.env.HEADED, viewport: { width: 1280, height: 800 },
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#conversationList .msg-item', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dùng bộ lọc "Phân loại" của Zalo: chọn thẻ có tên khớp LABEL
    const openMenu = async () => {
      if (!(await clickOutsideChats(page, 'Phân loại'))) throw new Error('Không tìm thấy nút "Phân loại" trên Zalo Web.');
      await page.waitForTimeout(800);
    };
    await openMenu();
    const names = await page.evaluate((sel) => [...document.querySelectorAll('div, span')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() && !e.closest(sel))
      .map((e) => e.textContent.trim()), CHAT_AREAS);
    const labelText = names.find((n) => n.toLowerCase() === LABEL);
    if (!labelText || !(await clickOutsideChats(page, labelText))) {
      console.log('Không tìm thấy thẻ phân loại khớp "' + LABEL + '" trong menu.');
      process.exitCode = 1;
      return;
    }
    await page.waitForTimeout(2000);
    console.log('Đã lọc theo thẻ "' + labelText + '"');

    const hitsMap = new Map();
    for (const tab of ['Ưu tiên', 'Khác']) {
      if (await clickOutsideChats(page, tab).catch(() => false)) await page.waitForTimeout(1500);
      try { await page.waitForSelector('#conversationList .msg-item', { timeout: 5000 }); } catch { console.log('Tab "' + tab + '": 0'); continue; }
      const rows = await collect(page);
      console.log('Tab "' + tab + '": ' + rows.length + ' hội thoại');
      for (const r of rows) hitsMap.set(r.name + '|' + r.uid, r);
    }
    // Không tin bộ lọc: chỉ giữ hàng thật sự mang nhãn (lọc hỏng thì danh sách chứa mọi hội thoại)
    const listed = [...hitsMap.values()];
    const hits = listed.filter((r) => r.name && r.labels.some((l) => l.trim().toLowerCase() === LABEL));
    console.log('Khớp thẻ "' + labelText + '": ' + hits.length);
    hits.forEach((h) => console.log(' -', h.name));
    if (listed.length > hits.length) console.log(`Bỏ qua ${listed.length - hits.length} hội thoại không mang thẻ này.`);

    // Bỏ lọc để trả giao diện về như cũ
    try { await openMenu(); await clickOutsideChats(page, labelText); } catch {}

    if (!hits.length) {
      console.log('Không hội thoại nào mang thẻ "' + labelText + '": không ghi gì vào watchlist.');
      process.exitCode = 1;
      return;
    }
    const merged = [...new Set([...cur, ...hits.map((h) => h.name)])];
    writeJson(OUT, merged);
    console.log(`Đã ghi ${merged.length} tên vào ${OUT}`);
  } finally {
    await ctx.close();
  }
})();
