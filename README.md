# zalo_tools — Theo dõi tin nhắn Zalo tự động

Công cụ này giúp bạn **không bỏ sót tin nhắn Zalo quan trọng**. Nó tự mở Zalo Web (bản Zalo chạy trên trình duyệt), nhìn vào danh sách hội thoại và cho bạn biết:

- Có tin mới ở đâu, của ai.
- **Nội dung đầy đủ từng tin mới** (ai nhắn, nhắn gì, lúc mấy giờ) ở những nhóm/khách bạn đánh dấu "cần theo dõi", kể cả khi có hàng chục tin trong vài phút.
- Tin nào **liên quan đến bạn** (nhắn riêng cho bạn, hoặc nhắc tên bạn trong nhóm).
- Cuối ngày, một **bản báo cáo tóm tắt** để bạn biết cần xử lý gì.
- Giao diện xem trên trình duyệt, **chia tab theo nhóm do bạn tự đặt** (không cần gắn thẻ trong Zalo).

> **Cần biết trước khi dùng:** để đọc đủ nội dung, công cụ **tự mở** các cuộc trò chuyện trong danh sách theo dõi mỗi khi có tin mới. Việc này khiến Zalo **đánh dấu các tin đó là "đã đọc" trên tài khoản của bạn** và **người gửi sẽ thấy "đã xem"**. Công cụ **không bao giờ gửi tin nhắn** và **chỉ mở những cuộc trò chuyện nằm trong danh sách theo dõi**; các cuộc trò chuyện khác không bị đụng tới. Muốn tắt hành vi này, đặt biến môi trường `NO_OPEN=1` (khi đó chỉ đọc được tin cuối của mỗi hội thoại).

Bạn không cần biết lập trình. Bạn chỉ cần làm theo từng bước bên dưới, sau đó **nói chuyện bằng tiếng Việt với Claude** (trợ lý AI) để nó làm các việc còn lại.

---

## Mục lục
1. [Bạn cần chuẩn bị gì](#1-bạn-cần-chuẩn-bị-gì)
2. [Cài đặt các phần mềm (làm một lần)](#2-cài-đặt-các-phần-mềm-làm-một-lần)
3. [Tải project và cài thư viện](#3-tải-project-và-cài-thư-viện)
4. [Thiết lập lần đầu (cách dễ nhất)](#4-thiết-lập-lần-đầu-cách-dễ-nhất)
5. [Dùng hằng ngày](#5-dùng-hằng-ngày)
6. [Danh sách skill (lệnh nói chuyện với Claude)](#6-danh-sách-skill-lệnh-nói-chuyện-với-claude)
7. [Xem kết quả ở đâu](#7-xem-kết-quả-ở-đâu)
8. [Chạy tự động và chi phí](#8-chạy-tự-động-và-chi-phí)
9. [Đăng xuất, đổi tài khoản Zalo](#9-đăng-xuất-đổi-tài-khoản-zalo)
10. [Gặp lỗi thì làm sao](#10-gặp-lỗi-thì-làm-sao)
11. [Quyền riêng tư và an toàn](#11-quyền-riêng-tư-và-an-toàn)
12. [Dành cho người muốn tự gõ lệnh](#12-dành-cho-người-muốn-tự-gõ-lệnh)

---

## 1. Bạn cần chuẩn bị gì

| Thứ cần có | Ghi chú |
|---|---|
| Máy tính chạy **Windows 10 hoặc 11** | Công cụ dùng "Task Scheduler" của Windows để chạy tự động, nên chưa hỗ trợ macOS/Linux. |
| Kết nối Internet | |
| **Tài khoản Zalo** trên điện thoại | Để quét mã QR đăng nhập Zalo Web. |
| **Trình duyệt Microsoft Edge** | Windows 10/11 có sẵn, không cần cài. |
| **Tài khoản Claude** (claude.ai) | Để dùng trợ lý Claude hướng dẫn và điều khiển công cụ. Cần gói có dùng được **Claude Code** (tính năng "Code" trong ứng dụng Claude). Xem mục 2.2. |

Các phần mềm cần cài (mục 2): **Node.js**, **Git** và **ứng dụng Claude** (Claude desktop app). Cả ba đều miễn phí để cài; riêng Claude cần tài khoản.

---

## 2. Cài đặt các phần mềm (làm một lần)

### 2.1. Cài Node.js (phiên bản 20.19 trở lên, khuyên dùng bản LTS)

Node.js là "động cơ" để chạy các tập lệnh của project. Phiên bản **tối thiểu là 20.19** (giao diện theo dõi cần bản này). Nên chọn bản **LTS** mới nhất.

1. Vào https://nodejs.org
2. Bấm nút tải **LTS** (có chữ "Recommended For Most Users").
3. Mở file vừa tải về, bấm **Next** liên tục và để mọi lựa chọn mặc định, cuối cùng bấm **Install** rồi **Finish**.
4. **Kiểm tra:** nhấn phím `Windows`, gõ `PowerShell`, mở **Windows PowerShell**, gõ lệnh sau rồi nhấn Enter:
   ```
   node --version
   ```
   Nếu hiện một số từ `v20.19.0` trở lên là thành công. Nếu báo "not recognized", hãy **khởi động lại máy** rồi thử lại.

### 2.2. Cài ứng dụng Claude (trợ lý AI, nơi bạn trò chuyện để điều khiển công cụ)

1. Vào https://claude.ai/download và tải **Claude cho Windows**.
2. Mở file tải về và cài đặt theo hướng dẫn (chấp nhận các lựa chọn mặc định).
3. Mở ứng dụng Claude và **đăng nhập tài khoản Claude** của bạn.

> Nếu chưa có tài khoản hoặc gói đăng ký phù hợp, hãy tạo/đăng ký tại https://claude.ai trước.
>
> Bạn cần dùng phần **Claude Code** của ứng dụng (thường là tab **Code**), không phải khung chat thường. Chỉ phần Code mới mở được thư mục trên máy bạn và chạy được các skill của project. Giao diện có thể thay đổi theo từng phiên bản ứng dụng; nếu không thấy tab Code, hãy cập nhật ứng dụng lên bản mới nhất hoặc kiểm tra gói đăng ký của bạn.

### 2.3. Cài Git (để tải project và cập nhật)

1. Vào https://git-scm.com/download/win — trình duyệt sẽ tự tải bản cài cho Windows (hoặc bấm **Click here to download** nếu không tự tải).
2. Mở file vừa tải về, bấm **Next** liên tục và để mọi lựa chọn mặc định, cuối cùng bấm **Install** rồi **Finish**.
3. **Kiểm tra:** mở **Windows PowerShell** (nhấn `Windows`, gõ `PowerShell`), gõ lệnh sau rồi nhấn Enter:
   ```
   git --version
   ```
   Nếu hiện dạng `git version 2.x.x` là thành công. Nếu báo "not recognized", hãy **khởi động lại máy** rồi thử lại.

---

## 3. Tải project và cài thư viện

### 3.1. Tải project về máy bằng Git

1. Chọn nơi đặt project: một thư mục dễ nhớ, không có dấu tiếng Việt trong đường dẫn và không quá sâu (ví dụ ổ `D:\`).
2. Nhấn phím `Windows`, gõ `PowerShell`, mở **Windows PowerShell**.
3. Gõ lần lượt hai lệnh sau, mỗi lệnh nhấn Enter:
   ```
   cd D:\
   git clone https://github.com/nguyencongson96/zalo_tools.git
   ```
   (Nếu muốn đặt ở ổ khác, đổi `D:\` thành ổ đó, ví dụ `C:\`.)
4. Git sẽ tạo thư mục `zalo_tools` (ví dụ `D:\zalo_tools`) chứa toàn bộ project. Các bước sau dùng thư mục này.

**Cập nhật phiên bản mới sau này:** mở PowerShell, vào thư mục project rồi chạy `git pull`:
```
cd D:\zalo_tools
git pull
```
Dữ liệu cá nhân của bạn (phiên đăng nhập, tin nhắn đã lưu, danh sách theo dõi) nằm trong thư mục `data/` và **không bị ghi đè** khi cập nhật. Sau khi cập nhật, chạy lại `npm install` rồi `npm run build` (mục 3.3) để thư viện và giao diện khớp với phiên bản mới.

> **Quan trọng:** sau khi bật chạy tự động (mục 8), **đừng di chuyển hay đổi tên thư mục này** nữa. Nếu lỡ di chuyển, hãy bảo Claude cài lại lịch tự động.

### 3.2. Mở project trong ứng dụng Claude

1. Mở ứng dụng Claude, chuyển sang tab **Code**.
2. Chọn thư mục project (**Select folder** hoặc tương tự) và chọn thư mục `zalo_tools` bạn vừa tải về ở mục 3.1 (ví dụ `D:\zalo_tools`).
3. Nếu ứng dụng hỏi có tin tưởng thư mục này không, hoặc xin quyền đọc/chạy lệnh trong thư mục, hãy đồng ý cho thư mục `zalo_tools`. Công cụ cần quyền này để chạy các lệnh quét.
4. Khung chat hiện ra là nơi bạn gõ các lệnh `/zalo_...` ở các mục sau.

### 3.3. Cài thư viện (một lần)

Cách dễ nhất: trong khung chat Claude, gõ:

```
hãy cài thư viện và build giao diện: npm install rồi npm run build
```

Claude sẽ chạy lệnh và báo kết quả (mất vài chục giây, không báo lỗi đỏ là được). Nếu ứng dụng hỏi xin phép chạy lệnh, bấm đồng ý.

Hoặc tự làm: nhấn phím `Windows`, gõ `PowerShell`, mở **Windows PowerShell**, vào thư mục project (ví dụ `cd D:\zalo_tools`) rồi gõ lần lượt `npm install` và `npm run build`.

---

## 4. Thiết lập lần đầu (cách dễ nhất)

Trong khung trò chuyện Claude, gõ:

```
/zalo_setup
```

Claude sẽ **dẫn bạn đi từng bước** và **hỏi ý kiến bạn trước khi bật bất cứ thứ gì**:

1. **Đăng nhập Zalo.** Một cửa sổ Edge mở ra với Zalo Web. Bạn dùng **điện thoại** mở Zalo → quét mã QR trên màn hình → chờ danh sách chat hiện ra → **đóng cửa sổ trình duyệt đó** (bước đóng cửa sổ là để lưu phiên đăng nhập, đừng bỏ qua).
2. **Gom nhóm (tùy chọn).** Claude quét danh sách (không mở cuộc trò chuyện nào), liệt kê mọi cuộc trò chuyện có đánh số, bạn trả lời kiểu *"1-5, 9: Khách hàng; 6, 7: Nội bộ"*. Mỗi nhóm thành một tab trên giao diện.
3. **Chọn đối tượng cần theo dõi.** Bạn nói tên các nhóm/khách quan trọng, ví dụ: *"Theo dõi nhóm 'Nhóm dự án A' và 'Khách Nguyễn Văn B'"*. Hoặc nói *"lấy tất cả chat có nhãn BIDV"* nếu bạn đã gắn nhãn (thẻ phân loại) trong Zalo.
4. **Cho Claude biết bạn là ai.** Tên bạn hay được gọi trong nhóm (ví dụ "Anh Sơn", "Sơn") và vài từ khóa bạn quan tâm (ví dụ "hợp đồng", "gấp"). Để công cụ biết tin nào *liên quan đến bạn*. Bạn trả lời thật, Claude sẽ không tự đoán. Hãy nêu **mọi cách gọi**: công cụ tìm đúng chuỗi bạn khai trong tin nhắn (không phân biệt hoa thường, có phân biệt dấu), nên nếu chỉ khai "Nguyễn Văn A" thì tin gọi "anh A" sẽ không được nhận ra.
5. **Quét lần đầu.** Công cụ ghi nhớ trạng thái hiện tại. Lần đầu **chưa báo tin nào**, từ lần quét sau mới phát hiện được thay đổi. Sau đó Claude mở giao diện cho bạn xem (mục 7).
6. **Hỏi bạn có muốn quét tự động không** và bao lâu một lần (gợi ý: 5 phút).
7. **Hỏi bạn có muốn báo cáo cuối ngày không** và vào giờ nào (ví dụ 18:00).
8. Tóm tắt những gì đã bật và cách tắt.

> Theo dõi càng nhiều cuộc trò chuyện thì càng nhiều tin bị tự đánh dấu "đã đọc". Chỉ nên chọn những nơi bạn thật sự cần.

Bạn có thể trả lời "Không, để sau" ở bước 2, 6 và 7. Chạy `/zalo_setup` lại bất cứ lúc nào để làm tiếp: với bước đã làm rồi, Claude hỏi bạn giữ nguyên hay làm lại. Nếu đã quét từ trước, lần quét ở bước 5 sẽ mở các cuộc trò chuyện theo dõi vừa có tin mới.

---

## 5. Dùng hằng ngày

Sau khi thiết lập xong, bạn chỉ cần hỏi Claude bằng tiếng Việt thông thường. Ví dụ:

| Bạn muốn | Gõ cho Claude |
|---|---|
| Biết có tin mới không | `/zalo_check` hoặc *"có tin Zalo mới không?"* |
| Xem tóm tắt trong ngày | `/zalo_report` hoặc *"báo cáo Zalo hôm nay"* |
| Biết tin nào liên quan đến mình | *"tin nào liên quan tôi?"* |
| Gom cuộc trò chuyện thành nhóm / tab | `/zalo_group` hoặc *"thêm Khách C vào nhóm Khách hàng"* |
| Thêm/bớt người cần theo dõi | `/zalo_watchlist` hoặc *"thêm Khách C vào theo dõi"* |
| Tắt/đổi lịch tự động | `/zalo_schedule` hoặc *"tắt chạy tự động"* |

Nếu đã bật quét tự động (mục 8), máy tự quét ngầm; bạn chỉ việc mở kết quả khi cần (mục 7).

---

## 6. Danh sách skill (lệnh nói chuyện với Claude)

"Skill" là các chức năng đã dựng sẵn. Bạn gọi bằng cách gõ dấu `/` và tên skill trong khung chat Claude, hoặc cứ nói ý bạn muốn, Claude sẽ tự chọn skill phù hợp.

| Skill | Dùng khi nào | Ghi chú |
|---|---|---|
| `/zalo_setup` | Lần đầu dùng, hoặc muốn thiết lập lại từ đầu | Đi qua đủ các bước ở mục 4. |
| `/zalo_login` | Cần đăng nhập Zalo lại (hết hạn phiên, đổi tài khoản) | Mở cửa sổ quét QR. |
| `/zalo_ui` | Mở giao diện theo dõi trên localhost, hoặc khi giao diện không cập nhật | Trang tự cập nhật khi dữ liệu đổi. |
| `/zalo_group` | Phân loại cuộc trò chuyện thành các nhóm (tab) theo ý bạn | Gom bằng cách trả lời trong chat; không mở cuộc trò chuyện nào. |
| `/zalo_watchlist` | Thêm/bớt đối tượng theo dõi; khai tên và từ khóa của bạn | Có thể thêm hàng loạt theo nhãn của Zalo. |
| `/zalo_check` | Muốn quét ngay, xem có tin mới không | Thường mất 15–20 giây; có thể vài phút (tới khoảng 10 phút) khi phải đọc nhiều cuộc trò chuyện. |
| `/zalo_report` | Muốn bản tóm tắt: việc cần xử lý, tin liên quan đến bạn | Chỉ **đọc** dữ liệu đã quét, không quét lại. |
| `/zalo_schedule` | Bật/tắt/đổi chu kỳ quét tự động và giờ báo cáo cuối ngày | Luôn hỏi bạn xác nhận trước khi đăng ký. |
| `/zalo_logout` | Đăng xuất, xóa dữ liệu, đổi sang tài khoản Zalo khác | Luôn cho xem trước và hỏi xác nhận trước khi xóa. |

---

## 7. Xem kết quả ở đâu

Giao diện là app React chạy trên máy bạn (localhost), thay cho file `index.html` trước đây. Lý do: khi dữ liệu đổi (quét, báo cáo, gom nhóm), **trang đang mở tự cập nhật theo**, còn file HTML tĩnh thì không.

**Mở giao diện:** bấm đúp file `scripts/start_ui.cmd` trong thư mục project (hoặc nhờ Claude *"mở giao diện Zalo"*, hoặc gõ `npm run ui`). Trình duyệt mở địa chỉ `http://127.0.0.1:4780/`. **Giữ cửa sổ lệnh mở** trong lúc xem; đóng cửa sổ là tắt giao diện. Giao diện chỉ chạy trên máy bạn, máy khác không truy cập được.

Giao diện gồm:
- **Các tab:** "Tất cả", mỗi nhóm bạn đã đặt một tab, và "Chưa phân nhóm" (hai loại sau chỉ hiện khi bạn đã đặt nhóm). Số trong ô xanh là tin mới trong 24 giờ.
- **Ô thống kê kiêm nút lọc:** "Tất cả", "Có tin mới", "Liên quan đến bạn", "Đang theo dõi" (đếm theo tab đang chọn; hai ô giữa kèm số tin trong 24 giờ). Bấm vào ô nào thì danh sách chỉ hiện các cuộc trò chuyện đó.
- **Danh sách:** gõ để tìm theo tên (không cần dấu). Cuộc trò chuyện có tin liên quan đến bạn xếp trên cùng và có vạch cam bên trái, tiếp theo là cuộc trò chuyện có tin mới. **Bấm vào một dòng** để xem lịch sử tin theo ngày ở khung bên phải (màn hình hẹp: mở toàn trang, bấm "Danh sách" để quay lại); bật "Chỉ tin liên quan" để lọc. Cuộc trò chuyện không theo dõi chỉ có dòng xem trước.
- **Dấu hiệu cần chú ý:** tiêu đề tab trình duyệt hiện số tin liên quan; quá 60 phút chưa có lần quét mới thì dòng "Quét gần nhất" cảnh báo dữ liệu có thể đã cũ.
- **Trang "Báo cáo":** các báo cáo cuối ngày, ngày mới nhất ở trên cùng.

Dữ liệu tự tải lại mỗi 30 giây, hiển thị tốt trên màn hình hẹp và chế độ tối. Giao diện không tự quét Zalo: dữ liệu mới có sau mỗi lần quét. Sau khi `git pull` có thay đổi giao diện, chạy lại `npm install` và `npm run build`.

---

## 8. Chạy tự động và chi phí

Khi bạn đồng ý, công cụ đăng ký hai tác vụ với Windows (xem/chỉnh trong "Task Scheduler"):

| Tác vụ | Làm gì | Dùng Claude? |
|---|---|---|
| **ZaloCheck** | Mỗi N phút tự quét Zalo ngầm (không hiện cửa sổ) và cập nhật dữ liệu cho giao diện | **Không**, không tốn phí Claude |
| **ZaloReport** | Mỗi ngày vào giờ bạn chọn, nhờ Claude viết báo cáo tóm tắt. Nếu dữ liệu cũ hơn 10 phút thì quét trước | **Có**, tốn lượng dùng Claude; có trần ngân sách **1 USD mỗi lần**, và nội dung tin nhắn đã lưu cùng cấu hình trong `data/` được gửi cho Claude để phân tích |

Điều cần biết:
- Mỗi lần quét tự động (kể cả lần quét trước báo cáo) **vẫn mở các cuộc trò chuyện theo dõi có tin mới**: tin bị đánh dấu "đã đọc" và người gửi thấy "đã xem", **ngay cả khi bạn không ngồi ở máy**.
- Công cụ **không đẩy thông báo** cho bạn. Muốn xem kết quả thì mở giao diện (mục 7) hoặc hỏi Claude.
- Máy tính phải **bật** và bạn phải **đã đăng nhập Windows** thì mới chạy. Máy ngủ thì lần sau thức dậy sẽ chạy bù.
- Mỗi lần quét mở một trình duyệt Edge ẩn, thường khoảng 15–20 giây (lâu hơn khi phải đọc nhiều cuộc trò chuyện). Quét dưới 3 phút một lần là quá dày.
- Tắt bất cứ lúc nào: nói với Claude *"tắt chạy tự động"* hoặc gõ `/zalo_schedule`.

---

## 9. Đăng xuất, đổi tài khoản Zalo

Gõ `/zalo_logout`. Claude sẽ:

1. **Cho bạn xem trước** những gì sẽ bị xóa (chưa xóa gì).
2. Hỏi bạn xác nhận, và hỏi bạn có muốn **giữ lại** danh sách theo dõi và thông tin cá nhân hay không.
3. Tắt các tác vụ tự động, rồi xóa phiên đăng nhập và dữ liệu cũ.

Việc xóa **không hoàn tác được**. Sau đó muốn dùng tài khoản khác, gõ `/zalo_setup`.

> Lưu ý: việc này chỉ đăng xuất trên máy tính này. Máy có thể vẫn hiện trong danh sách "thiết bị đã đăng nhập" của Zalo trên điện thoại. Hãy đăng xuất thiết bị đó ở ứng dụng Zalo nếu bạn muốn.

---

## 10. Gặp lỗi thì làm sao

Cách nhanh nhất: **chép nguyên thông báo lỗi dán cho Claude** và nhờ xử lý. Một số trường hợp thường gặp:

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Quét báo lỗi "phiên hết hạn" hoặc dữ liệu đứng yên | Zalo yêu cầu quét lại QR (lâu không dùng, đăng xuất từ điện thoại, đổi thiết bị) | Gõ `/zalo_login` |
| `node` hoặc `npm` "not recognized" | Chưa cài Node.js hoặc chưa khởi động lại máy sau khi cài | Cài lại theo mục 2.1, khởi động lại máy |
| `git` "not recognized" | Chưa cài Git hoặc chưa khởi động lại máy sau khi cài | Cài theo mục 2.3, khởi động lại máy |
| `git clone` báo "Authentication failed", "not found" hoặc đòi đăng nhập GitHub | Bạn chưa có quyền truy cập kho project, hoặc địa chỉ gõ sai | Kiểm tra lại địa chỉ; nếu kho ở chế độ riêng tư, nhờ người quản lý cấp quyền cho tài khoản GitHub của bạn rồi đăng nhập khi được hỏi |
| `git pull` báo "error: Your local changes ... would be overwritten" | Bạn đã tự sửa file của project | Nhờ Claude: *"xử lý lỗi git pull giúp tôi"* (đừng tự xóa thư mục `data/`) |
| Lỗi liên quan "profile đang được dùng" / không mở được trình duyệt | Đang mở cửa sổ đăng nhập Zalo của công cụ trong khi quét | Đóng cửa sổ Edge của công cụ rồi thử lại. Không chạy 2 thao tác Zalo cùng lúc |
| Giao diện không có tin của ai | Chưa thêm ai vào danh sách theo dõi, hoặc chưa có tin mới kể từ lần quét đầu tiên | Gõ `/zalo_watchlist` để kiểm tra danh sách, rồi `/zalo_check` sau khi có tin mới |
| Giao diện ghi "Có thể thiếu tin", hoặc quét cảnh báo "không đọc được nội dung" | Zalo không tải được hết tin cũ, mở cuộc trò chuyện bị lỗi, hoặc một lần quét có hơn 25 cuộc trò chuyện theo dõi cùng có tin mới | Mở Zalo xem trực tiếp cuộc trò chuyện đó |
| Tin nhóm gọi đến bạn nhưng không được đánh dấu "liên quan" | Cách gọi đó chưa được khai | Nhờ Claude thêm tên (`/zalo_watchlist`); chỉ áp dụng cho tin quét sau đó |
| Giao diện báo "Không kết nối được server" hoặc trang không mở | Cửa sổ chạy giao diện đã đóng | Bấm đúp `scripts/start_ui.cmd` lại |
| Báo "Chưa build giao diện" | Chưa chạy bước cài giao diện | `npm install` rồi `npm run build` |
| Không mở được cổng 4780 | Chương trình khác đang dùng cổng | Đặt biến môi trường `ZALO_UI_PORT` sang số khác |
| Không có "báo cáo cuối ngày" | Chưa bật, hoặc máy tắt đúng giờ báo cáo | Gõ `/zalo_schedule` để xem trạng thái |
| Báo cáo cuối ngày tự động không ra; `data/log/report.log` ghi "khong tim thay Claude CLI" | Tác vụ ZaloReport gọi lệnh `claude` chạy ngầm, mà máy chỉ có ứng dụng Claude, chưa có lệnh `claude` trong PATH | Nhờ Claude: *"cài Claude Code CLI cho tôi"* (cần Node.js), rồi mở lại PowerShell và thử `claude --version`. Kiểm tra bằng `powershell -File scripts/run_report.ps1 -DryRun`. Quét tự động (ZaloCheck) không bị ảnh hưởng |
| Zalo đổi giao diện nên công cụ đọc sai | Zalo Web cập nhật | Nhờ Claude chạy chế độ chẩn đoán và sửa mã đọc giao diện |
| Lỡ di chuyển hoặc đổi tên thư mục project | Lịch tự động đang trỏ vào đường dẫn cũ | Nhờ Claude: *"đăng ký lại lịch tự động"* |

Các file nhật ký lỗi (để gửi cho người hỗ trợ nếu cần): `data/log/errors.log`, `data/log/check.log`, `data/log/report.log` và ảnh chụp `data/log/last_error.png`.

---

## 11. Quyền riêng tư và an toàn

- Công cụ **không bao giờ gửi tin nhắn**. Nó chỉ **mở** các cuộc trò chuyện trong danh sách theo dõi khi có tin mới, nên Zalo đánh dấu các tin đó là "đã đọc" và người gửi thấy "đã xem" (xem phần đầu tài liệu).
- Bạn **tự quét QR** bằng điện thoại của mình. Công cụ không bao giờ hỏi mật khẩu Zalo của bạn.
- Toàn bộ dữ liệu (phiên đăng nhập, nội dung các tin nhắn đã đọc được, tên các cuộc trò chuyện, nhóm và danh sách theo dõi) được lưu **trên máy của bạn**, trong thư mục `data/`.
- **Không gửi thư mục `data/` cho ai.** Thư mục `data/profile/` chứa phiên đăng nhập Zalo của bạn: ai có nó có thể vào Zalo của bạn.
- Khi bạn trò chuyện với Claude hoặc bật báo cáo cuối ngày, **nội dung các tin nhắn được lưu trong `data/` được gửi tới Claude** để phân tích. Nếu bạn không muốn, đừng bật báo cáo và đừng nhờ Claude đọc dữ liệu theo dõi.
- Hãy dùng công cụ cho tài khoản Zalo của chính bạn và tuân thủ quy định công ty/khách hàng của bạn về việc xử lý tin nhắn.

---

## 12. Dành cho người muốn tự gõ lệnh

Mọi thứ trên đều có thể làm bằng lệnh, chạy từ thư mục gốc của project (Node.js 20.19+):

| Việc | Lệnh |
|---|---|
| Cài thư viện | `npm install` · `npm run build` |
| Mở giao diện | `npm run ui` |
| Lưu danh sách mọi cuộc trò chuyện (không mở cuộc nào) | `node scripts/check.js --list` |
| Gom nhóm | `node scripts/groups.js list` · `show` · `apply <ops.json>` |
| Đăng nhập (quét QR rồi đóng cửa sổ) | `node scripts/login.js` |
| Quét một lần | `node scripts/check.js` (thêm biến `HEADED=1` để hiện cửa sổ, `DEBUG_ROWS=1` để in dữ liệu thô) |
| Chỉ kiểm tra đăng nhập (không mở cuộc trò chuyện, không ghi dữ liệu theo dõi) | `node scripts/check.js --verify` |
| Thêm vào danh sách theo dõi mọi chat có nhãn "BIDV" | `node scripts/build_watchlist.js BIDV` |
| Đăng xuất (mặc định chỉ liệt kê) | `node scripts/logout.js` · thêm `--yes` để xóa thật · thêm `--keep-config` để giữ danh sách theo dõi, `me.json` và nhóm |
| Lập báo cáo ngay như tác vụ tự động (có dùng Claude) | `powershell -ExecutionPolicy Bypass -File scripts/run_report.ps1` · thêm `-DryRun` để chỉ xem trước |
| Phát triển giao diện | `npm run dev` (cần `npm run ui` chạy kèm để có dữ liệu) · `npm run lint` |
| Xem trạng thái lịch tự động | `powershell -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Action status` |
| Bật quét mỗi 5 phút | `... -File scripts/schedule.ps1 -Action install-check -Minutes 5` |
| Bật báo cáo lúc 18:00 | `... -File scripts/schedule.ps1 -Action install-report -At 18:00` |
| Tắt lịch (`check`, `report` hoặc `all`) | `... -File scripts/schedule.ps1 -Action remove -Target all` |

Thêm `-DryRun` vào các lệnh `schedule.ps1` để chỉ xem trước mà không đăng ký gì. Biến môi trường `NO_OPEN=1` tắt việc tự mở hội thoại (chỉ đọc danh sách); `UNREAD_ALERT_MIN` (mặc định 30) đổi ngưỡng cảnh báo "chưa đọc quá lâu", nhưng vì công cụ tự mở hội thoại theo dõi nên cảnh báo này hầu như không còn kích hoạt; `ZALO_REPORT_BUDGET` (mặc định 1) đổi trần ngân sách USD của mỗi báo cáo.

**Cấu trúc thư mục**

```
scripts/         mã chạy: check, chat, list, conversations, groups, login, logout, build_watchlist,
                 tracking, view, server, markdown, save_report, config, store (.js)
                 schedule.ps1, run_report.ps1, run_check.cmd, run_hidden.vbs, start_ui.cmd
src/             mã giao diện React (build ra dist/, KHÔNG bị xóa khi đăng xuất)
data/            dữ liệu cá nhân của bạn (phiên đăng nhập, tin nhắn, cấu hình):
                 profile/ (phiên đăng nhập), state.json, log/, tracking/, conversations.json, groups.json,
                 group_index.json, watchlist.json, me.json
.claude/skills/  9 skill zalo_* ở mục 6
```

`data/watchlist.json` là danh sách tên hội thoại (phải khớp **chính xác** tên hiển thị trên Zalo). `data/me.json` có `aliases` (tên bạn được gọi trong nhóm) và `keywords` (từ khóa quan tâm). Quy tắc "liên quan đến tôi": chat riêng với bạn = có; nhóm nhắc tên hoặc từ khóa của bạn = có; nhóm khác = không (nếu chưa khai `aliases` thì là "chưa rõ"); tin do chính bạn nhắn = không. Đây là quy tắc đơn giản mang tính gợi ý; đánh giá theo nội dung do skill `zalo_report` thực hiện.
