// Dựng trang HTML để người dùng mở bằng trình duyệt (không cần app đọc Markdown).
//   esc(s)         - escape ký tự HTML (mọi nội dung tin nhắn đều phải qua đây)
//   page({...})    - bọc nội dung vào trang HTML hoàn chỉnh lấy từ scripts/template.html (CSS + JS nội tuyến, sáng/tối tự động)
//   mdToHtml(md)   - chuyển Markdown đơn giản (báo cáo do Claude viết) sang HTML, không cho chèn HTML thô
const fs = require('fs');
const path = require('path');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Giao diện (CSS + JS + khung HTML) nằm ở scripts/template.html: sửa giao diện ở đó, đừng sửa trong code.
// Template có hai chỗ giữ chỗ: {{TITLE}} và {{BODY}}. Chú thích hướng dẫn đầu file được bỏ khi dựng trang.
const TEMPLATE_FILE = path.join(__dirname, 'template.html');

function page({ title, body }) {
  let tpl;
  try { tpl = fs.readFileSync(TEMPLATE_FILE, 'utf8'); }
  catch (e) { throw new Error(`Không đọc được template giao diện ${TEMPLATE_FILE}: ${e.message}`); }
  tpl = tpl.replace(/<!--[\s\S]*?-->\n?/, '');           // bỏ chú thích hướng dẫn (chỉ chú thích đầu tiên)
  if (!tpl.includes('{{BODY}}')) throw new Error(`${TEMPLATE_FILE} thiếu chỗ giữ chỗ {{BODY}}`);
  return tpl.replace('{{TITLE}}', () => esc(title)).replace('{{BODY}}', () => body);
}

// ---- Markdown -> HTML (tập con: tiêu đề, danh sách, bảng, trích dẫn, đậm/nghiêng/code, liên kết) ----
function inline(src) {
  let s = esc(src);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>');
  // chỉ cho phép liên kết http(s)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

function mdToHtml(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if (/^>/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`); continue;
    }
    if (/^\|/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(l); i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      out.push(`<div class="wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
        let t = lines[i++].replace(/^\s*([-*]|\d+[.)])\s+/, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i])) t += ' ' + lines[i++].trim();
        items.push(`<li>${inline(t)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
    }
    const buf = [lines[i++]]; // luôn nhận dòng hiện tại (vd dòng "|" không thành bảng) để vòng lặp tiến lên
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|\||```|\s*([-*]|\d+[.)])\s+)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

module.exports = { esc, page, mdToHtml };
