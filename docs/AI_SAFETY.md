# AI SAFETY & RESPONSIBLE USAGE POLICY
## SaigonDrain AI — Tiêu Chuẩn An Toàn Trí Tuệ Nhân Tạo & Phòng Ngừa Rủi Ro Ngập Lụt

**Mã tài liệu:** SD-SAFE-2026-V2  
**Phiên bản:** 2.0.0  
**Phạm vi áp dụng:** Toàn bộ hệ thống AI/ML, Thuật toán Định tuyến và Ứng dụng Di động SaigonDrain  
**Trạng thái:** Enforced Standard  

---

## 1. Nguyên tắc Đạo đức & Cam kết An toàn Sinh mạng (Ethical Mandate)

Dự báo ngập lụt và điều hướng giao thông trong đô thị là bài toán có tác động trực tiếp tới **an toàn tính mạng con người** và **tài sản lớn** (xe cộ, hàng hóa). Khi di chuyển qua vùng ngập tại TP.HCM, người dân đối diện với các hiểm họa tiềm ẩn:
- Nước cuốn trôi vào hố ga mất nắp, cống hở ven đường.
- Rò rỉ điện từ các cột đèn chiếu sáng hoặc trạm biến áp ngập nước.
- Chết máy giữa dòng nước xiết, gây hoảng loạn và tai nạn liên hoàn.
- Hiện tượng thủy kích phá hủy hoàn toàn động cơ ô tô.

### Nguyên tắc Bất biến: "Thà Cảnh Báo Thận Trọng Hơn Bỏ Sót Nguy Hiểm" (Asymmetric Risk Principle)
Trong hệ thống SaigonDrain AI:
- **Âm tính giả (False Negative - Có ngập nhưng AI báo không ngập):** Là thảm họa an toàn nghiêm trọng nhất. Người dùng tin tưởng AI đi vào vùng ngập sâu có thể chết máy hoặc gặp tai nạn.
- **Dương tính giả (False Positive - Không ngập sâu nhưng AI đề xuất đi vòng né tránh):** Chỉ làm tăng thêm 1–2 km hoặc 3–5 phút di chuyển, nhưng bảo toàn tuyệt đối sự an toàn cho phương tiện và con người.
- **Quy tắc thiết kế:** Mọi ngưỡng cảnh báo của mô hình Machine Learning và thuật toán định tuyến luôn ưu tiên thiên về phương án phòng ngừa an toàn (safety-biased).

---

## 2. Ma trận Ngưỡng An toàn theo Phương tiện (Vehicle Critical Depth Thresholds)

Mỗi loại phương tiện có kết cấu cơ khí, độ cao cổ hút gió và bán kính quay đầu hoàn toàn khác biệt. Hệ thống áp dụng ma trận ngưỡng vật lý chuẩn:

| Cấp độ Mực Nước | 🛵 Xe Máy (Motorcycle) | 🚗 Xe Hơi (Automobile) | Hành Động Của Hệ Thống AI |
|---|---|---|---|
| **$0 - 10\text{ cm}$** | Khô ráo / Ướt nhẹ | Hoàn toàn bình thường | Không phạt lộ trình. Khuyến nghị tuyến đi nhanh nhất. |
| **$10 - 15\text{ cm}$** | Nước mấp mé vành xe | Bắn nước gầm xe | Cảnh báo mức thấp. Bật icon lưu ý trên bản đồ. |
| **$15 - 20\text{ cm}$** | **Ngưỡng nhạy cảm:** Nước chạm ống xả xe tay ga | Mấp mé gầm xe Sedan | **Xe máy:** Phạt điểm rủi ro ($+30$ penalty), ưu tiên tuyến tránh. |
| **$20 - 30\text{ cm}$** | **NGUY HIỂM CAO:** Nguy cơ nước tràn bầu lọc gió, chết máy tức thì | Nước dâng ngang mép dưới cản trước | **Xe máy: CẤM ĐIỀU HƯỚNG QUA.** Tự động bẻ lộ trình vòng qua đường khác.<br/>**Xe hơi:** Phạt điểm rủi ro ($+70$ penalty). |
| **$\ge 35\text{ cm}$** | **CỰC KỲ NGUY HIỂM:** Mất kiểm soát lái, té ngã | **NGƯỠNG THỦY KÍCH (HYDROLOCK):** Nước vào họng nạp khí động cơ | **CẤM TUYỆT ĐỐI MỌI PHƯƠNG TIỆN.** Tự động phong tỏa phân đoạn đường trên bản đồ số. |

### An toàn Điều hướng trong Hẻm đối với Xe Hơi:
- Xe hơi bị cấm tuyệt đối điều hướng vào các ngõ hẻm có bề rộng $< 3.5\text{ m}$ hoặc hẻm cụt trong lúc triều cường dâng.
- Nếu điểm đi hoặc điểm đến của xe hơi nằm trong hẻm hẹp, hệ thống hướng dẫn người lái dừng xe tại bãi đỗ / trục đường chính gần nhất kèm bước đi bộ.

---

## 3. Quản lý Độ Không Chắc Chắn của Mô hình ML (Uncertainty & Limitations)

### 3.1. Phân định rõ Giới hạn Mô hình (Susceptibility vs Hydrodynamic Simulation)
Mô hình Machine Learning (LightGBM & MCDA) trong thư mục `ml/` được huấn luyện trên dữ liệu GIS địa hình tĩnh (FABDEM 30m, độ dốc Horn, khoảng cách thủy hệ, mật độ bê tông hóa ESA) kết hợp 425 điểm ngập lịch sử IRD.
- Mô hình cung cấp: **Chỉ số nhạy cảm ngập lụt tương đối của đoạn đường (0.00 – 1.00)**.
- Mô hình **KHÔNG** tuyên bố dự báo chính xác mực nước tuyệt đối từng centimet nếu thiếu trạm đo cảm biến thủy văn dày đặc tại từng ngã ba.
- Khi hiển thị trên giao diện người dùng, hệ thống luôn ghi chú rõ ràng nguồn gốc: *"Đánh giá dựa trên mô hình nhạy cảm địa hình & dữ liệu triều cường động"*.

### 3.2. Cơ chế Suy thoái An toàn (Graceful Degradation & Fallback)
Khi xảy ra sự cố gián đoạn (mất mạng, Open-Meteo API phản hồi chậm $> 5\text{s}$, hoặc mô hình ML gặp ngoại lệ):
1. **Fallback cấp 1:** Tự động kích hoạt bộ quy tắc chuyên gia (Rule-based Fallback) dựa trên bảng tra cứu 425 điểm ngập lịch sử đã lưu sẵn trong cơ sở dữ liệu local.
2. **Fallback cấp 2:** Nếu mất kết nối tới dịch vụ định tuyến trực tuyến (OSRM / Google Routes), hệ thống trả về lộ trình an toàn tiêu chuẩn đã được lưu vết và kiểm định thủ công giữa các trục đường lớn.
3. **Cảnh báo minh bạch:** Ứng dụng hiển thị thông báo trạng thái: *"Hệ thống đang hoạt động ở chế độ dữ liệu an toàn ngoại tuyến"*.

---

## 4. Kiểm duyệt Dữ liệu Cộng đồng & Chống Tin giả (Crowdsourcing Integrity)

Để tránh hiện tượng người dùng báo cáo sai lệch (troll / spam) gây hoang mang dư luận hoặc điều hướng giao thông sai:
1. **Xác thực Không gian GPS (Geofence Validation):**  
   Người dùng chỉ được gửi báo cáo ngập nếu tọa độ GPS thực tế của thiết bị nằm trong bán kính $\le 500\text{ m}$ so với vị trí được đánh dấu trên bản đồ.
2. **Quy trình Phê duyệt Hai Bước (Two-Tier Moderation):**
   - **Trạng thái `Pending` (Màu vàng cam):** Báo cáo mới hiển thị dưới dạng chấm cảnh báo cộng đồng chưa kiểm định.
   - **Trạng thái `Approved` (Màu đỏ / nâu sẫm):** Chỉ sau khi Ban Quản trị viên đối chiếu với ảnh chụp hiện trường, trạm đo hoặc camera giao thông thì điểm ngập mới chính thức được đưa vào thuật toán tính toán phạt lộ trình né ngập.
3. **Giới hạn Tần suất (Rate Limiting):**  
   Mỗi thiết bị / địa chỉ IP bị giới hạn tối đa 3 lượt gửi báo cáo trong vòng 15 phút.

---

## 5. Tuyên bố Miễn trừ Trách nhiệm Pháp lý & Hướng dẫn Người dùng (User Disclaimer)

Trong ứng dụng di động `frontend/user`, hộp thoại thông tin và phần chân trang luôn tích hợp điều khoản an toàn bắt buộc:

> **TUYÊN BỐ AN TOÀN SAIGONDRAIN AI:**  
> *"Ứng dụng SaigonDrain AI cung cấp thông tin hỗ trợ điều hướng dựa trên mô hình dự báo học máy và dữ liệu thời tiết, thủy văn công cộng. Tình hình ngập úng thực tế trên đường có thể biến đổi nhanh chóng do mưa dông cục bộ, rác nghẹt miệng cống hoặc sự cố công trình đô thị.*  
> *Người điều khiển phương tiện phải luôn quan sát thực tế tại hiện trường, tuyệt đối tuân thủ hiệu lệnh của cảnh sát giao thông, biển cảnh báo ngập sâu và ưu tiên an toàn tính mạng lên trên hết. Không cố tình phóng xe qua vùng nước sâu chảy xiết."*
