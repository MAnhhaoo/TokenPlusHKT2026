# Kế hoạch thiết kế và triển khai DrainGuard AI — User Map Prototype

## 1. Mục tiêu

Thiết kế và triển khai một giao diện web/app dành cho người dân TP.HCM, lấy cảm hứng từ mô hình tương tác của Waze/Google Maps nhưng có nhận diện riêng cho DrainGuard AI. Prototype phải giúp người dùng trả lời nhanh ba câu hỏi:

1. Khu vực quanh tôi hiện tại và trong 1–2 giờ tới có mưa/ngập không?
2. Tôi nên đi tuyến nào để an toàn hơn, và vì sao?
3. Tôi có thể báo nhanh một điểm ngập hoặc cống bị tắc như thế nào?

Đây là prototype tương tác hoàn chỉnh phục vụ demo hackathon, không phải tích hợp backend hay bản đồ thương mại thật.

## 2. Phạm vi đã chốt

- Một ứng dụng một trang, mobile-first và responsive lên tablet/desktop.
- Giao diện tiếng Việt.
- Bản đồ TP.HCM cách điệu bằng SVG/CSS và dữ liệu mô phỏng, không cần API key.
- Một hành trình mẫu từ vị trí hiện tại đến “Nhà” qua khu vực Bình Thạnh/Thảo Điền, đủ để thể hiện dự báo đón đầu rủi ro.
- Hai phương án tuyến:
  - **Cân bằng**: nhanh hơn nhưng đi gần một điểm có rủi ro ngập.
  - **Ưu tiên an toàn**: xa/chậm hơn một chút nhưng tránh vùng ngập.
- Các tương tác chính:
  - chọn mốc thời gian dự báo;
  - chọn phương án tuyến và thấy tuyến trên bản đồ đổi theo;
  - mở chi tiết một điểm cảnh báo;
  - mở luồng báo cáo cộng đồng, chọn loại sự cố/mức độ và gửi báo cáo mô phỏng;
  - thu gọn/mở rộng bảng thông tin trên mobile.
- Không triển khai đăng nhập, hồ sơ, onboarding, backend, upload ảnh thật, định vị thật, dẫn đường turn-by-turn thật hoặc SDK bản đồ.

## 3. Định hướng trải nghiệm và thị giác

### 3.1. Nguyên tắc UX

- **Safety first**: tuyến an toàn luôn nổi bật hơn tuyến nhanh.
- **Glanceable**: người dùng đang di chuyển có thể hiểu trạng thái trong vài giây.
- **Explainable**: mỗi đề xuất phải nói rõ phần đường nào nguy hiểm và lợi ích khi đi vòng.
- **Progressive disclosure**: bản đồ là bề mặt chính; thông tin chi tiết nằm trong bottom sheet/side panel.
- **Accessible**: không chỉ dùng màu để phân biệt mức độ; kết hợp màu, nhãn, biểu tượng và pattern.

### 3.2. Visual language

- Nền bản đồ sáng, ít nhiễu; đường phố dùng xám lạnh và xanh nhạt.
- Màu thương hiệu chủ đạo: xanh navy/deep teal tạo cảm giác tin cậy, kết hợp cyan cho dữ liệu thời tiết.
- Trạng thái cảnh báo:
  - vàng hổ phách: cần chú ý;
  - cam: rủi ro cao;
  - đỏ: ngập sâu/nguy hiểm;
  - xanh ngọc: tuyến an toàn hoặc khu vực khô ráo.
- Typography: dùng một Google Font hỗ trợ tiếng Việt tốt như **Be Vietnam Pro**, khai báo ở đầu `src/index.css`, với hệ phân cấp rõ ràng cho tiêu đề, số liệu và nội dung.
- Bo góc mềm, bóng đổ tiết chế, bề mặt trắng hơi trong để giữ cảm giác hiện đại mà vẫn dễ đọc trên bản đồ.
- Không dùng emoji; biểu tượng được dựng bằng SVG nhỏ, nhất quán về stroke.

## 4. Cấu trúc giao diện

### 4.1. Mobile

- **Top bar nổi trên bản đồ**
  - logo/wordmark DrainGuard;
  - trạng thái “Đang theo dõi TP.HCM”;
  - avatar/menu tối giản.
- **Khối tìm đường**
  - điểm đi “Vị trí của bạn”;
  - điểm đến “Nhà · Thảo Điền”;
  - nút đảo điểm hoặc chỉnh sửa mô phỏng.
- **Bản đồ toàn màn hình**
  - mạng đường cách điệu;
  - sông Sài Gòn và nhãn khu vực;
  - hai polyline tuyến đi;
  - vùng mưa/ngập dạng blob/heat zone;
  - marker cảnh báo có nhãn mức độ;
  - marker vị trí hiện tại và đích đến.
- **Các control nổi**
  - định vị lại;
  - lớp dữ liệu mưa/ngập;
  - nút “Báo cáo” nổi bật nhưng không che tuyến.
- **Bottom sheet**
  - trạng thái tổng quan: “Có thể di chuyển — nên tránh Nguyễn Hữu Cảnh”;
  - dải chọn thời gian “Hiện tại / +30 phút / +60 phút / +90 phút”;
  - thẻ hai phương án tuyến với thời gian, quãng đường và mức an toàn;
  - phần giải thích rõ tuyến an toàn dài hơn bao nhiêu và tránh được rủi ro gì;
  - CTA “Bắt đầu hành trình an toàn”.
- **Bottom navigation**
  - Bản đồ;
  - Theo dõi;
  - Đã lưu.

### 4.2. Desktop/tablet

- Chuyển bottom sheet thành side panel trái có chiều rộng giới hạn.
- Bản đồ chiếm phần không gian còn lại và giữ đầy đủ controls/markers.
- Thông tin tuyến, timeline và cảnh báo cùng xuất hiện trong panel để demo trên màn hình lớn không cần cuộn quá nhiều.

## 5. Luồng tương tác

### 5.1. Chọn dự báo theo thời gian

- Mặc định ở “+30 phút” để thể hiện khác biệt cốt lõi của sản phẩm.
- Khi đổi mốc:
  - cập nhật nhãn lượng mưa và mức rủi ro;
  - thay đổi độ rộng/opacity của vùng cảnh báo trên bản đồ;
  - cập nhật thông điệp tổng quan trong panel.

### 5.2. Chọn tuyến

- Mặc định chọn “Ưu tiên an toàn”.
- Click/tap thẻ tuyến sẽ:
  - đổi trạng thái selected;
  - đưa polyline tương ứng lên foreground;
  - cập nhật ETA, quãng đường và phần giải thích;
  - thay đổi CTA theo tuyến đang chọn.
- Tuyến cân bằng hiển thị cảnh báo “đi gần vùng ngập dự báo sau 25 phút”.
- Tuyến an toàn giải thích rõ: “Dài hơn 1,2 km, thêm 6 phút, tránh điểm ngập sâu tại Nguyễn Hữu Cảnh”.

### 5.3. Xem điểm cảnh báo

- Tap marker mở một popover/card ngắn với:
  - tên đường;
  - mức nước dự kiến;
  - thời gian cập nhật;
  - nguồn dữ liệu “AI + 12 báo cáo cộng đồng”;
  - hành động “Tránh điểm này”.
- Popover đóng bằng nút rõ ràng hoặc tap ra ngoài.

### 5.4. Báo cáo cộng đồng

- Nút “Báo cáo” mở modal/bottom sheet:
  1. chọn “Điểm ngập” hoặc “Cống bị tắc”;
  2. chọn mức độ bằng các thẻ dễ hiểu;
  3. vùng ảnh mô phỏng với nút “Thêm ảnh”;
  4. xác nhận vị trí mô phỏng;
  5. gửi và hiển thị trạng thái thành công trong modal.
- Không upload hoặc lưu dữ liệu thật; sau khi gửi chỉ cập nhật trạng thái UI.

## 6. Kiến trúc triển khai

### 6.1. `src/App.tsx`

- Xây toàn bộ prototype bằng React state cục bộ, không thêm router hay backend.
- Tách các phần giao diện thành component nội bộ rõ nghĩa để dễ đọc:
  - `TopBar`
  - `RouteSearch`
  - `MapCanvas`
  - `ForecastTimeline`
  - `RouteOption`
  - `JourneyPanel`
  - `AlertDetail`
  - `ReportModal`
  - `BottomNav`
- Khai báo dữ liệu mẫu bằng typed constants:
  - forecast slots;
  - route options;
  - alert markers.
- State tối thiểu:
  - `selectedForecast`;
  - `selectedRoute`;
  - `selectedAlert`;
  - `isReportOpen`;
  - `reportType`;
  - `reportSeverity`;
  - `reportSubmitted`;
  - `isPanelExpanded`.
- Dùng SVG nội tuyến cho bản đồ, tuyến, marker và icon để prototype tự chứa, sắc nét và không phụ thuộc package ngoài.

### 6.2. `src/index.css`

- Giữ `@import 'tailwindcss';` ở đầu, sau đó import font Google theo đúng thứ tự CSS.
- Thêm theme tokens bằng custom properties cho brand, trạng thái và bóng đổ.
- Thiết lập font, màu nền, antialiasing và hành vi overscroll cho toàn trang.
- Thêm CSS cho các phần khó diễn đạt chỉ bằng utility:
  - map grid/texture;
  - flood/rain pulse;
  - route draw/highlight;
  - bottom-sheet transitions;
  - reduced-motion fallback.
- Dùng Tailwind utilities trực tiếp trong JSX cho layout, spacing, responsive và trạng thái.

## 7. Accessibility và responsive

- Các button có `type="button"`, nhãn rõ ràng và `aria-pressed`/`aria-expanded` khi phù hợp.
- Modal báo cáo có `role="dialog"`, tiêu đề liên kết bằng ARIA và nút đóng.
- Focus ring dễ thấy trên nền sáng lẫn nền bản đồ.
- Vùng chạm chính tối thiểu khoảng 44px.
- Độ tương phản chữ/nền đạt mức đọc tốt; màu cảnh báo luôn đi cùng icon/nhãn.
- Tôn trọng `prefers-reduced-motion`.
- Kiểm tra tối thiểu ở các breakpoint khoảng 390px, 768px và 1440px; không để panel che controls hoặc nội dung bị tràn.

## 8. Trạng thái và edge cases cần thể hiện

- Nội dung tiếng Việt dài không làm vỡ thẻ route hoặc modal.
- Chỉ một route và một alert được chọn tại một thời điểm.
- Đóng/mở modal sẽ reset trạng thái thành công hợp lý cho lần báo cáo tiếp theo.
- Khi bottom sheet thu gọn, vẫn thấy trạng thái an toàn và tay nắm mở rộng.
- Trên viewport thấp, panel/modal cuộn nội bộ thay vì đẩy bản đồ hoặc CTA ra khỏi màn hình.
- Dữ liệu là mô phỏng phải được ghi chú kín đáo “Dữ liệu minh họa” để không gây hiểu nhầm trong demo.

## 9. Tiêu chí hoàn thành

- Người xem hiểu được giá trị khác biệt của DrainGuard AI trong vòng 10 giây.
- Có thể thao tác đầy đủ ba luồng: đổi dự báo, chọn tuyến, gửi báo cáo mô phỏng.
- Tuyến an toàn được chọn mặc định và có giải thích định lượng rõ ràng.
- Giao diện hoạt động tốt cả mobile và desktop, không phụ thuộc kết nối API ngoài.
- Không có lỗi TypeScript/JSX, không có nội dung tràn hoặc control quan trọng bị che.
- Không thêm dependency nếu không cần thiết.

## 10. Kiểm tra sau triển khai

1. Chạy formatter theo script của repository: `pnpm format`.
2. Chạy build production: `pnpm build`.
3. Kiểm tra thủ công trên preview đang chạy sẵn:
   - mobile khoảng 390 × 844;
   - tablet khoảng 768 × 1024;
   - desktop khoảng 1440 × 900.
4. Thử toàn bộ tương tác:
   - bốn mốc dự báo;
   - hai tuyến;
   - mở/đóng cảnh báo;
   - mở modal, chọn loại/mức độ, gửi và đóng;
   - thu gọn/mở rộng panel;
   - điều hướng bằng bàn phím cho các control chính.
5. Không khởi động thêm development server vì môi trường Figma Make đã cung cấp server và hot reload.
