// Cuộn danh sách hội thoại của Zalo Web - dùng chung cho check.js, chat.js, build_watchlist.js.
// Danh sách là virtualized (mỗi lần chỉ vẽ một phần) và phần tử cuộn là một phần tử CHA của #conversationList.

// to: 'top' | 'down'. Trả về { ok: tìm được phần tử cuộn, moved: vị trí có đổi }
function scrollList(page, to) {
  return page.evaluate((to) => {
    let el = document.querySelector('#conversationList');
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 5) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) return { ok: false, moved: false };
    const before = el.scrollTop;
    el.scrollTop = to === 'top' ? 0 : before + Math.max(200, el.clientHeight * 0.6);
    return { ok: true, moved: el.scrollTop !== before };
  }, to);
}

// Cuộn hết danh sách, gọi grab() ở mỗi bước; grab() gom các hàng đang vẽ và trả về tổng số đã gom.
// Zalo tải thêm khi cuộn tới đáy, nên chỉ dừng sau 3 lần liên tiếp ở đáy mà không có gì mới.
// Trả về false nếu hết maxSteps mà chưa tới cuối (danh sách có thể còn thiếu).
async function scrollThrough(page, grab, maxSteps = 120) {
  await scrollList(page, 'top');
  await page.waitForTimeout(500);
  let idle = 0;
  let step = 0;
  for (; step < maxSteps && idle < 3; step++) {
    const before = await grab();
    const s = await scrollList(page, 'down');
    if (!s.ok) break;
    await page.waitForTimeout(s.moved ? 500 : 1500);
    if (s.moved) idle = 0; // còn cuộn được (vừa tải thêm) thì đếm lại từ đầu
    else idle = (await grab()) > before ? 0 : idle + 1;
  }
  await grab();
  await scrollList(page, 'top');
  return step < maxSteps || idle >= 3;
}

module.exports = { scrollList, scrollThrough };
