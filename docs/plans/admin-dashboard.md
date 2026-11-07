# Kế hoạch thiết kế và triển khai DrainGuard AI Admin Dashboard

## 1. Mục tiêu

Xây dựng một prototype admin dashboard một màn hình, tương tác đầy đủ, dành cho đội vận hành DrainGuard AI tại TP.HCM. Giao diện phải giúp người quản trị:

- Nắm nhanh tình hình ngập và mưa trên toàn thành phố.
- Tạo, cập nhật và kết thúc cảnh báo theo khu vực.
- Kiểm tra ảnh, thông tin hiện trường và xác nhận hoặc từ chối báo cáo cộng đồng.
- Theo dõi tổng số báo cáo, điểm nguy cơ cao, báo cáo chờ xác minh và xu hướng theo thời gian.
- Xem vị trí ngập, điểm nguy cơ, lượng mưa dự báo và lịch sử ngập trên bản đồ TP.HCM.
- Trình diễn rõ giá trị “cảnh báo sớm + dữ liệu cộng đồng + điều hành đô thị” trong bối cảnh hackathon.

Prototype chạy hoàn toàn trên frontend với dữ liệu mẫu có tính thực tế, không yêu cầu backend, API key hoặc kết nối dịch vụ bản đồ.

## 2. Phạm vi và nguyên tắc sản phẩm

### Trong phạm vi

- Một dashboard desktop-first, co giãn tốt xuống tablet và mobile.
- Điều hướng sidebar thể hiện các phân hệ, trong đó “Tổng quan” là màn hình hoạt động chính.
- Bản đồ vector mô phỏng TP.HCM có marker, vùng rủi ro, lớp dữ liệu và panel chi tiết.
- Các thao tác nghiệp vụ chính hoạt động bằng React state:
  - lọc dữ liệu;
  - chọn điểm trên bản đồ;
  - mở chi tiết báo cáo;
  - xác nhận/từ chối báo cáo;
  - tạo cảnh báo;
  - cập nhật hoặc kết thúc cảnh báo;
  - chuyển khoảng thời gian thống kê;
  - bật/tắt lớp dữ liệu bản đồ.
- Dữ liệu mẫu tiếng Việt cho các địa bàn và điểm ngập quen thuộc tại TP.HCM.
- Toast hoặc thông báo trạng thái sau thao tác.

### Ngoài phạm vi

- Backend, đăng nhập thật, phân quyền thật hoặc đồng bộ thời gian thực.
- Geocoding, GPS, API thời tiết hoặc bản đồ tile thật.
- Upload ảnh thật và xử lý AI thật.
- Routing đa trang; sidebar chỉ thay đổi trạng thái chọn hoặc đưa focus tới vùng nội dung tương ứng.

## 3. Định hướng visual

### Tinh thần

“Urban command center” hiện đại, đáng tin cậy và dễ đọc, nhưng không quá tối hoặc nặng chất quân sự. Thiết kế cần đủ nổi bật cho bài thi hackathon đồng thời vẫn giống một sản phẩm vận hành thực tế.

### Hệ thống hình ảnh

- Nền tổng thể sáng hơi lạnh; card trắng, đường viền tinh tế và bóng rất nhẹ.
- Màu chủ đạo xanh navy/teal biểu thị hạ tầng đô thị và nước.
- Màu trạng thái:
  - đỏ/coral: nguy cơ nghiêm trọng hoặc ngập sâu;
  - cam/amber: cảnh báo cao, cần xử lý;
  - xanh dương: mưa/dự báo;
  - xanh lá: đã xác minh hoặc tình trạng an toàn;
  - xám: đã kết thúc/không hoạt động.
- Typography sans-serif hiện đại, rõ số liệu; ưu tiên một Google Font công khai phù hợp tiếng Việt như Be Vietnam Pro, import trong `src/index.css`.
- Icon dùng `lucide-react`; bổ sung dependency thay vì emoji hoặc ký hiệu Unicode rời rạc.
- Bo góc vừa phải, mật độ thông tin cao nhưng có khoảng thở; các số liệu quan trọng dùng tabular numerals.

### Bố cục responsive

- Desktop lớn:
  - sidebar cố định bên trái;
  - topbar phía trên;
  - KPI và biểu đồ ở hàng đầu;
  - bản đồ chiếm khoảng 2/3 chiều rộng, cột “Báo cáo cần xác minh” chiếm 1/3;
  - bảng/cảnh báo hoạt động ở phía dưới.
- Tablet:
  - sidebar thu gọn;
  - bản đồ và danh sách báo cáo xếp dọc nếu không đủ chiều ngang.
- Mobile:
  - sidebar thành thanh điều hướng gọn;
  - KPI thành lưới 2 cột;
  - map, danh sách và bảng xếp một cột;
  - modal/panel chi tiết chiếm gần toàn màn hình.

## 4. Cấu trúc màn hình

### 4.1 Sidebar

- Logo “DrainGuard AI” với biểu tượng khiên/giọt nước.
- Nhãn ngữ cảnh “Trung tâm điều hành”.
- Các mục:
  - Tổng quan;
  - Bản đồ ngập;
  - Báo cáo cộng đồng;
  - Cảnh báo khu vực;
  - Phân tích dữ liệu.
- Khối trạng thái cuối sidebar:
  - “Hệ thống hoạt động”;
  - thời điểm đồng bộ gần nhất;
  - avatar và vai trò “Điều phối viên”.

### 4.2 Topbar

- Tiêu đề “Tổng quan điều hành”.
- Dòng mô tả thời gian cập nhật.
- Chip trạng thái thời tiết hiện tại, ví dụ “Mưa lớn diện rộng”.
- Nút icon thông báo có badge.
- CTA chính “Tạo cảnh báo”.

### 4.3 KPI cards

Bốn card có số liệu, thay đổi nhỏ theo dữ liệu trong state:

1. Tổng báo cáo ngập hôm nay.
2. Điểm nguy cơ cao.
3. Chờ xác minh.
4. Cảnh báo đang hoạt động.

Mỗi card gồm:

- icon;
- số chính;
- so sánh với hôm qua hoặc chỉ báo xu hướng;
- sparkline mini bằng SVG/CSS;
- semantic color phù hợp.

### 4.4 Khối xu hướng theo thời gian

- Biểu đồ diện tích/đường đơn giản, tự dựng bằng SVG để không thêm thư viện chart nặng.
- Hai chuỗi dữ liệu:
  - số báo cáo;
  - lượng mưa trung bình.
- Bộ chọn “24 giờ / 7 ngày / 30 ngày”.
- Tooltip khi hover hoặc focus vào điểm dữ liệu.
- Dòng insight ngắn, ví dụ: “Đỉnh báo cáo trùng thời điểm mưa lớn lúc 17:30”.

### 4.5 Bản đồ vận hành TP.HCM

Bản đồ là trung tâm thị giác của trang:

- Nền vector trừu tượng mô phỏng mạng đường, sông Sài Gòn và ranh giới các khu vực; không tuyên bố là bản đồ địa lý chính xác.
- Nhãn các khu vực tiêu biểu: Thủ Đức, Bình Thạnh, Gò Vấp, Quận 7, Bình Chánh, Nhà Bè.
- Marker theo loại:
  - điểm ngập đã xác minh;
  - báo cáo chờ xác minh;
  - điểm nguy cơ dự báo;
  - trạm/cảm biến mưa.
- Các vùng heat halo thể hiện mức nguy cơ.
- Thanh công cụ lớp dữ liệu:
  - Ngập hiện tại;
  - Nguy cơ;
  - Mưa dự báo;
  - Lịch sử ngập.
- Bộ lọc mức độ: Tất cả / Nghiêm trọng / Cao / Trung bình.
- Legend luôn hiển thị rõ màu và ý nghĩa.
- Click marker mở popover hoặc detail drawer với:
  - tên vị trí;
  - mức nước ước tính;
  - lượng mưa;
  - thời gian ghi nhận;
  - độ tin cậy;
  - số lần ngập lịch sử;
  - CTA “Xem báo cáo” hoặc “Tạo cảnh báo”.

### 4.6 Danh sách báo cáo cần xác minh

- Danh sách 3–5 báo cáo ưu tiên, mỗi item có:
  - thumbnail ảnh hiện trường;
  - địa điểm;
  - thời gian;
  - mức ngập người dân khai báo;
  - confidence AI;
  - tag “Chờ xác minh”.
- Click item mở modal chi tiết.
- Modal chi tiết hiển thị:
  - ảnh hiện trường lớn;
  - metadata: người gửi ẩn danh, tọa độ, thời gian, mô tả;
  - kết quả AI: loại sự cố, mức nước ước tính, khả năng ảnh hợp lệ;
  - bản đồ mini/vị trí;
  - cảnh báo trùng lặp nếu gần báo cáo khác;
  - textarea ghi chú nội bộ;
  - nút “Từ chối” và “Xác nhận báo cáo”.
- Khi xác nhận:
  - trạng thái báo cáo chuyển sang verified;
  - KPI chờ xác minh giảm;
  - marker đổi trạng thái;
  - hiện toast thành công.
- Khi từ chối:
  - yêu cầu chọn lý do ngắn;
  - trạng thái chuyển rejected;
  - KPI cập nhật;
  - hiện toast.

### 4.7 Cảnh báo đang hoạt động

- Bảng hoặc danh sách card gọn với:
  - khu vực;
  - cấp độ;
  - phạm vi ảnh hưởng;
  - thời điểm bắt đầu;
  - thời hạn dự kiến;
  - trạng thái;
  - người tạo;
  - menu thao tác.
- Hành động:
  - xem/cập nhật nội dung;
  - kết thúc cảnh báo;
  - chọn cảnh báo để highlight vùng tương ứng trên bản đồ.

### 4.8 Modal tạo/cập nhật cảnh báo

Form gồm:

- khu vực;
- cấp độ: Theo dõi / Cảnh báo / Nghiêm trọng;
- loại nguy cơ: ngập đường, mưa lớn, cống tắc, triều cường;
- tiêu đề;
- thông điệp cho người dân;
- thời gian hiệu lực;
- checkbox/kênh phát hành giả lập: Web, Push, Trung tâm điều hành;
- bản xem trước thông báo.

Validation:

- bắt buộc khu vực, cấp độ, tiêu đề, nội dung và thời hạn;
- lỗi hiển thị inline;
- submit thành công thêm hoặc cập nhật cảnh báo trong state, cập nhật KPI và toast.

Kết thúc cảnh báo cần hộp xác nhận để tránh thao tác nhầm; sau khi xác nhận, trạng thái chuyển “Đã kết thúc” và marker/vùng cảnh báo trên bản đồ được cập nhật.

## 5. Chức năng bổ sung hợp lý

Để tăng tính thuyết phục của bài thi mà không mở rộng quá mức:

- Chỉ số “độ tin cậy dữ liệu” trên báo cáo, kết hợp AI và số lượt xác nhận cộng đồng.
- Cảnh báo báo cáo trùng lặp theo vị trí/thời gian.
- “Ưu tiên xử lý” tự động cho báo cáo gần trường học, bệnh viện hoặc trục đường chính.
- Log hoạt động ngắn trong detail panel, ví dụ ai đã xác minh hoặc cập nhật cảnh báo.
- Dòng insight vận hành dựa trên dữ liệu mẫu để giải thích mối quan hệ giữa lượng mưa và số báo cáo.

Không bổ sung các module nặng như quản lý người dùng, phân quyền hoặc điều phối đội hiện trường vì không phải trọng tâm brief.

## 6. Mô hình dữ liệu frontend

Định nghĩa TypeScript types trong `src/App.tsx` hoặc file dữ liệu riêng nếu `App.tsx` trở nên quá dài:

- `FloodReport`
  - `id`, `location`, `district`, `coordinates`, `reportedAt`;
  - `imageUrl` hoặc local visual placeholder;
  - `description`, `reportedDepth`, `aiDepth`, `aiConfidence`;
  - `severity`, `status`, `priority`, `duplicateOf?`, `historyCount`.
- `AreaAlert`
  - `id`, `area`, `level`, `hazardType`, `title`, `message`;
  - `startedAt`, `expiresAt`, `status`, `channels`, `createdBy`.
- `MapPoint`
  - `id`, `x`, `y`, `type`, `severity`, `label`, `rainfall`, `depth`, `historyCount`, `linkedReportId?`.
- `TrendPoint`
  - `label`, `reports`, `rainfall`.

State chính:

- `reports`;
- `alerts`;
- `selectedReportId`;
- `selectedMapPointId`;
- `activeMapLayers`;
- `severityFilter`;
- `trendRange`;
- modal mode `create | edit | review | reject-confirm | end-confirm | null`;
- toast queue hoặc một toast hiện tại.

Các KPI được derive bằng `filter`/`reduce` từ state thay vì hard-code riêng, bảo đảm thao tác duyệt và cảnh báo phản ánh ngay lên dashboard.

## 7. Kiến trúc component

Giữ thay đổi nhỏ và phù hợp scaffold:

- `src/App.tsx`
  - layout chính;
  - mock data;
  - state và event handlers;
  - các component cục bộ có tên rõ ràng:
    - `Sidebar`;
    - `Topbar`;
    - `MetricCard`;
    - `TrendChart`;
    - `OperationsMap`;
    - `ReportQueue`;
    - `ReportReviewModal`;
    - `AlertTable`;
    - `AlertModal`;
    - `ConfirmDialog`;
    - `Toast`.
- `src/index.css`
  - Google Font import đặt trước Tailwind import;
  - theme variables/token semantic;
  - body defaults;
  - animation nhỏ cho modal, toast, marker pulse và trạng thái hover/focus;
  - các utility đặc thù khó biểu diễn rõ bằng class Tailwind nếu cần.
- `package.json` / `pnpm-lock.yaml`
  - thêm `lucide-react` cho iconography nhất quán.

Nếu `App.tsx` vượt mức dễ bảo trì sau khi dựng, tách dữ liệu và types sang `src/data.ts`; không tạo hệ thống component phức tạp khi chỉ có một màn hình.

## 8. Chi tiết tương tác và accessibility

- Tất cả button/icon button có accessible name.
- Modal có `role="dialog"`, tiêu đề liên kết bằng `aria-labelledby`, đóng bằng Escape và click backdrop.
- Focus được đưa vào modal khi mở; nút đóng luôn nhìn thấy.
- Marker bản đồ là button focusable, có tooltip và trạng thái selected.
- Màu không phải tín hiệu duy nhất: luôn đi kèm nhãn/icon.
- Trạng thái toast dùng `aria-live`.
- Hover và focus-visible có độ tương phản rõ.
- Form có label, mô tả lỗi và trạng thái disabled khi dữ liệu chưa hợp lệ.
- Tôn trọng `prefers-reduced-motion`.

## 9. Dữ liệu demo đề xuất

Sử dụng dữ liệu tiếng Việt có tính thuyết phục, ví dụ:

- Nguyễn Hữu Cảnh, Bình Thạnh — nghiêm trọng, 45 cm, mưa 82 mm.
- Quốc Hương, Thảo Điền — cao, 30 cm.
- Huỳnh Tấn Phát, Quận 7 — cao, liên quan triều cường.
- Phan Huy Ích, Gò Vấp — trung bình, cống tắc.
- Nguyễn Văn Quá, Quận 12 — báo cáo chờ xác minh.
- Nguyễn Văn Linh, Bình Chánh — nguy cơ dự báo trong 45 phút.

Ảnh báo cáo dùng các khối minh họa/local gradient có chủ đích hoặc ảnh remote ổn định nếu đã có nguồn phù hợp; không dùng ảnh trang trí chung vì đây là màn hình vận hành, không phải landing page.

## 10. Trình tự triển khai

1. Bổ sung `lucide-react`, xác nhận dependency và lockfile.
2. Thiết lập font, theme tokens và global base styles trong `src/index.css`.
3. Xây layout shell: sidebar, topbar, responsive grid.
4. Tạo mock data và TypeScript models.
5. Xây KPI cards và biểu đồ xu hướng.
6. Xây bản đồ vector, layer controls, filter, marker selection và detail popover.
7. Xây hàng đợi báo cáo và modal review; nối confirm/reject với state/KPI/map.
8. Xây bảng cảnh báo, modal create/edit và confirm kết thúc cảnh báo.
9. Thêm toast, focus behavior, responsive states và reduced motion.
10. Rà soát nội dung tiếng Việt, hierarchy, trạng thái trống và các lỗi validation.

## 11. Kiểm thử và tiêu chí hoàn thành

### Kiểm tra chức năng thủ công

- Chọn từng marker mở đúng dữ liệu và highlight marker.
- Layer toggle và severity filter thay đổi đúng các điểm hiển thị.
- Chuyển khoảng thời gian cập nhật biểu đồ và insight.
- Xác nhận một báo cáo làm giảm KPI “Chờ xác minh”, đổi trạng thái báo cáo và marker.
- Từ chối một báo cáo yêu cầu lý do và loại báo cáo khỏi hàng chờ.
- Tạo cảnh báo hợp lệ thêm dòng mới, tăng KPI và hiện trên bản đồ.
- Form thiếu dữ liệu không submit và hiển thị lỗi đúng trường.
- Cập nhật cảnh báo thay đổi nội dung hiện có.
- Kết thúc cảnh báo qua confirm dialog làm đổi trạng thái và giảm KPI.
- Modal đóng bằng nút đóng, Escape và backdrop.

### Kiểm tra giao diện

- Không tràn ngang ở các breakpoint mobile, tablet và desktop.
- Sidebar, map controls, modal và bảng vẫn đọc được ở màn hình hẹp.
- Contrast đủ rõ; trạng thái không phụ thuộc chỉ vào màu.
- Không dùng emoji; icon nhất quán từ Lucide.
- Nội dung tiếng Việt hiển thị đúng dấu.

### Kiểm tra kỹ thuật

- Chạy formatter theo script repository: `pnpm format`.
- Chạy production build cho thay đổi UI diện rộng: `pnpm build`.
- Nếu formatter thay đổi file, kiểm tra lại diff để bảo đảm không phát sinh thay đổi ngoài phạm vi.
- Không khởi động thêm development server vì môi trường Figma Make đã cung cấp server và hot reload.

## 12. Kết quả bàn giao mong đợi

- Dashboard admin có chất lượng trình diễn hackathon, thể hiện rõ điểm khác biệt của DrainGuard AI.
- Luồng quản trị cảnh báo và xác minh báo cáo có thể thao tác trực tiếp, không chỉ là mockup tĩnh.
- Bản đồ mô phỏng đủ trực quan để kể câu chuyện về ngập hiện tại, nguy cơ tương lai, mưa và lịch sử.
- Code TypeScript/React dễ đọc, phạm vi gọn, không phụ thuộc backend hay dịch vụ ngoài.
