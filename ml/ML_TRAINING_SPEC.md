# TECHNICAL & ML TRAINING SPECIFICATION
## HCMC Road Flood Susceptibility Machine Learning Architecture

**Document ID:** HCMC-FLOOD-ML-SPEC-002  
**Target Repository:** `ml/` (SaigonDrain & HCMC Road Flood Project)  
**Research Base:** `hcmc-road-flood-ml` (Python 3.12 / uv / LightGBM / GeoPandas)  
**Status:** Integrated Technical Specification  
**Version:** 2.0.0 (Production & Colab Integration)  
**Language:** Tiếng Việt & English Technical Terms  

---

## 1. Tuyên bố phạm vi & Nguyên tắc Cốt lõi (Scope & Principles)

1. **Bản chất mô hình (Flood Susceptibility, not 60-minute water-level simulation):**  
   Mô hình đánh giá **mức độ nhạy cảm / nguy cơ ngập lụt tương đối** (relative flood susceptibility index, thang điểm 0.0 - 1.0 hoặc 0 - 100) của từng **đoạn đường (road segment)** tại TP.HCM dựa trên hình thái học địa hình (DEM), độ dốc (slope), thủy văn (khoảng cách kênh rạch), mật độ bề mặt bê tông hóa (impervious built-up surface) và phân bố không gian các điểm ngập lịch sử (historical flood hotspots).
2. **Không tuyên bố sai lệch:**  
   Mô hình không tuyên bố dự báo chính xác mực nước tuyệt đối từng centimet theo thời gian thực 60 phút nếu thiếu trạm đo thủy văn dày đặc; thay vào đó, chỉ số nhạy cảm (susceptibility) của đoạn đường kết hợp cùng dữ liệu lượng mưa thời gian thực (Open-Meteo) và cao độ đỉnh triều bán nhật triều (Phú An / Nhà Bè) để xếp hạng an toàn tuyến đường.
3. **Tính độc lập & Chống rò rỉ không gian (Spatial Autocorrelation Guard):**  
   Huấn luyện và đánh giá bắt buộc sử dụng phân vùng không gian dạng khối (spatial block cross-validation) với vùng đệm an toàn 1.000 m (guard buffer) giữa tập huấn luyện (reference) và tập kiểm thử độc lập (holdout) nhằm ngăn chặn rò rỉ dữ liệu do tự tương quan không gian (spatial autocorrelation).

---

## 2. Nguồn dữ liệu huấn luyện (Datasets D01 - D07)

| Mã ID | Dataset | Định dạng & Độ phân giải | Vai trò trong Pipeline | Bản quyền / License |
|---|---|---|---|---|
| **D01** | **IRD Historical Flood Database** (425 ghi nhận 2002–2026) | GPKG / GeoJSON, thuộc tính: nguyên nhân (mưa/triều), độ sâu (cm), địa chỉ | Bằng chứng thực nghiệm điểm ngập (Positive evidence / Presence points) | CC BY-NC 4.0 (IRD/DataSuds) |
| **D02** | **OpenStreetMap (OSM) Vietnam** | Vector `.osm.pbf` / `.gpkg`, trích xuất `highway=*` | Khung mạng lưới giao thông, phân đoạn đường 150m, phân loại trục đường | ODbL / OpenStreetMap Contributors |
| **D03** | **FABDEM Vietnam (Forest And Buildings removed DEM)** | Raster GeoTIFF, độ phân giải ~30 m (EPSG:9210) | Mô hình số cao độ bề mặt đã lọc bỏ cây cối và nhà xưởng, tính cao độ và độ dốc | CC BY-NC-SA 4.0 (Bristol University) |
| **D03b** | **Copernicus DEM GLO-30** | DSM ~30 m | Nguồn kiểm tra chéo và đối chiếu độ nhạy cao độ | Open Access (ESA) |
| **D04** | **HCMC Water Bodies (`HCMC_water.gpkg`)** | Vector LineString & Polygon sông ngòi, kênh rạch, hồ điều tiết | Tính khoảng cách Euclid ngắn nhất từ tim đường tới mặt nước thoát (`dist_water_m`) | Open Research Data |
| **D05** | **ESA WorldCover 2021** | GeoTIFF 10 m (phân loại Land Cover) | Đo lường tỷ lệ bề mặt bê tông hóa, nhà ở (`builtup_ratio_250m`) | CC BY 4.0 (ESA) |
| **D06** | **JRC Global Surface Water (GSW v1.4)** | Raster 30 m | Tần suất xuất hiện mặt nước mùa mưa và độ ổn định dòng chảy | Open Access (EC JRC) |
| **D07** | **Open-Meteo Weather Reanalysis & API** | Time-series theo giờ (hourly precipitation mm/h, soil moisture) | Khí hậu mưa tích lũy và tích hợp thời tiết thời gian thực | CC BY 4.0 (Open-Meteo) |

Tất cả các nguồn dữ liệu thô được theo dõi hàm băm SHA-256, URL nguồn, CRS và metadata trong file `ml/data/raw/manifest.yaml`.

---

## 3. Quy trình chuẩn hóa hình học & Phân đoạn đường (Road Segmentation)

1. **Hệ quy chiếu chuẩn (CRS):** Toàn bộ dữ liệu được tái chiếu (reproject) đồng nhất sang hệ toạ độ phẳng **EPSG:9210** (WGS 84 / UTM zone 48N - Vietnam) để tính toán khoảng cách (mét) và diện tích chuẩn xác, sau đó xuất ra **EPSG:4326** cho GeoJSON và Web Map.
2. **Khu vực nghiên cứu (Area of Interest - AOI):** Địa giới hành chính TP.HCM được định nghĩa trong cấu hình `ml/configs/study_area.yaml`.
3. **Phân đoạn tim đường (Road Segmentation Algorithm):**
   - Các trục đường chính (motorway, trunk, primary, secondary, tertiary, residential, unclassified) được cắt tại các nút giao (intersections / junctions).
   - Chiều dài mục tiêu của mỗi phân đoạn là **$150\text{ m}$** (tối thiểu $30\text{ m}$, tối đa $200\text{ m}$).
   - Mỗi phân đoạn được cấp một mã nhận diện bất biến `road_segment_id` (ví dụ: `SEG_Q1_NGUYEN_HUE_001`).

---

## 4. Bảng thuộc tính đặc trưng (Feature Schema)

Mỗi đoạn đường được trích xuất vector đặc trưng $X \in \mathbb{R}^5$ (hoặc mở rộng $\mathbb{R}^8$ khi bổ sung thuộc tính mặt đường):

| Tên Feature | Kiểu | Mô tả tính toán | Tác động vật lý tới ngập lụt |
|---|---|---|---|
| `elevation_median_m` | float32 | Giá trị trung vị (median) của cao độ FABDEM trong hành lang 15m dọc phân đoạn | Cao độ thấp $\rightarrow$ nước dồn về trũng trũng, nguy cơ ngập cao |
| `relative_elevation_m` | float32 | Chênh lệch giữa cao độ đoạn đường và cao độ trung bình bán kính lân cận 500m ($Z_{\text{seg}} - \bar{Z}_{500\text{m}}$) | Giá trị âm biểu thị vùng trũng dạng lòng chảo (topographic depression) |
| `slope_mean_deg` | float32 | Độ dốc bề mặt địa hình trung bình theo thuật toán Horn $3 \times 3$ (độ) | Độ dốc bằng phẳng ($< 1.5^\circ$) $\rightarrow$ tiêu thoát nước chậm |
| `dist_water_m` | float32 | Khoảng cách Euclid ngắn nhất từ tim phân đoạn đến sông/kênh/rạch gần nhất (m) | Gần kênh rạch $\rightarrow$ chịu ảnh hưởng triều cường cực đoan dâng ngược |
| `builtup_ratio_250m` | float32 | Tỷ lệ diện tích bề mặt nhân tạo / đô thị (ESA class 50) trong buffer 250m | Tỷ lệ bê tông hóa cao $\rightarrow$ giảm thấm tự nhiên, tăng hệ số dòng chảy mặt |
| `highway_rank` | int16 | Thứ bậc đường OSM (1: Trunk, 2: Primary, 3: Secondary, 4: Tertiary, 5: Residential) | Bề rộng mặt đường và khả năng ưu tiên hệ thống cống thoát |
| `historical_density_500m`| float32 | Mật độ điểm ngập lịch sử (Kernel Density) ghi nhận từ IRD trong bán kính 500m | Bằng chứng thực địa về điểm đen ngập úng kinh niên |

---

## 5. Mô hình Baseline: Multi-Criteria Decision Analysis (MCDA)

Mô hình baseline sử dụng phân tích đa tiêu chí không gian để tính toán chỉ số nhạy cảm ngập lụt mà không phụ thuộc vào nhãn âm chưa xác minh:

### 5.1. Chuẩn hóa Robust Min-Max (Percentile-based Normalization)
Để tránh ảnh hưởng bởi giá trị ngoại lai (outliers), mỗi đặc trưng $f$ được chuẩn hóa về đoạn $[0, 1]$ bằng bách phân vị $P_5$ và $P_{95}$:

$$\tilde{f} = \text{clip}\left(\frac{f - P_5(f)}{P_{95}(f) - P_5(f)}, 0, 1\right)$$

- Đối với đặc trưng tỷ lệ nghịch với ngập (Cao độ `elevation_median_m`, Độ dốc `slope_mean_deg`, Khoảng cách nước `dist_water_m`):
  $$S_f = 1.0 - \tilde{f}$$
- Đối với đặc trưng tỷ lệ thuận với ngập (Bê tông hóa `builtup_ratio_250m`, Điểm trũng `relative_elevation_m` âm):
  $$S_f = \tilde{f}$$

### 5.2. Công thức tổ hợp trọng số (Weight Aggregation)
Chỉ số nhạy cảm tổng hợp (MCDA Score $\in [0, 100]$):

$$\text{MCDA\_Score} = 100 \times \sum_{i=1}^{k} w_i \cdot S_{f_i}$$

Các bộ trọng số cấu hình kiểm tra độ nhạy (Sensitivity Configurations):
1. **Equal Weights (Cân bằng):** $w = [0.20, 0.20, 0.20, 0.20, 0.20]$
2. **Terrain-Heavy (Ưu tiên địa hình trũng):** $w_{\text{elev}} = 0.35, w_{\text{rel\_elev}} = 0.25, w_{\text{water}} = 0.15, w_{\text{slope}} = 0.15, w_{\text{builtup}} = 0.10$
3. **Water-Heavy (Ưu tiên ảnh hưởng triều & sông rạch):** $w_{\text{water}} = 0.35, w_{\text{elev}} = 0.25, w_{\text{rel\_elev}} = 0.15, w_{\text{builtup}} = 0.15, w_{\text{slope}} = 0.10$
4. **Built-Up-Heavy (Ưu tiên đô thị hóa ngập do mưa):** $w_{\text{builtup}} = 0.35, w_{\text{water}} = 0.25, w_{\text{elev}} = 0.15, w_{\text{slope}} = 0.15, w_{\text{rel\_elev}} = 0.10$

---

## 6. Mô hình Machine Learning: Track B (Presence-Background Learning)

### 6.1. Bản chất bài toán (PU Learning / Presence-Background)
Trong dữ liệu ngập đô thị, chúng ta chỉ có tập hợp các điểm ghi nhận ngập đã được xác nhận (Presence / Positive $Y = 1$ từ 425 điểm IRD). Không có dữ liệu ghi nhận rằng "đoạn đường này tuyệt đối không bao giờ ngập" (Unlabeled / Background).
Do đó, mô hình hóa dưới dạng **Presence-Background Ranking** (tương tự thuật toán MaxEnt hoặc Bagging PU Learning trong sinh thái học và tai biến địa chất):
- **Tập Presence ($\mathcal{P}$):** Các đoạn đường được gán nhãn `accepted` sau khi khớp không gian với sự kiện ngập IRD.
- **Tập Background ($\mathcal{U}$):** Các đoạn đường lấy mẫu ngẫu nhiên từ không gian nghiên cứu chưa có ghi nhận ngập. Tỷ lệ lấy mẫu tiêu chuẩn là **$1 : 10$** (1 điểm presence ứng với 10 điểm background), kèm kiểm tra độ nhạy ở tỷ lệ $1:5$ và $1:20$.

### 6.2. Phân vùng không gian (Spatial Block Cross-Validation)
- Không gian TP.HCM được chia thành lưới ô vuông kích thước $2.000\text{ m} \times 2.000\text{ m}$.
- Các khối được chia vào tập Reference (Train/Val: 70%) và Holdout (Test độc lập: 30%).
- Vùng đệm $1.000\text{ m}$ xung quanh đường biên khối kiểm thử được loại bỏ khỏi tập huấn luyện để ngăn chặn việc thông tin địa hình lân cận bị rò rỉ.

### 6.3. Thuật toán huấn luyện (LightGBM & Regularized Logistic Regression)
1. **LightGBM Classifier:**
   - `objective`: `'binary'`
   - `learning_rate`: $0.05$
   - `max_depth`: $4$ (giữ cây nông để hạn chế overfitting trên dữ liệu không gian)
   - `num_leaves`: $15$
   - `subsample`: $0.8$, `colsample_bytree`: $0.8$
   - `n_estimators`: $200$ (kèm early stopping 20 rounds theo PR-AUC trên validation block)
2. **Logistic Regression (Baseline có thể giải thích):**
   - `C`: $1.0$ (L2 regularization)
   - `solver`: `'lbfgs'`
   - `StandardScaler` fitted duy nhất trên tập reference blocks.

---

## 7. Tiêu chí Đánh giá Mô hình (Evaluation Metrics)

Vì tỷ lệ nền background chứa cả những đoạn đường ngập nhưng chưa được báo cáo, các độ đo truyền thống như Accuracy sẽ gây ngộ nhận. Quy chuẩn đánh giá sử dụng:

1. **Length-Weighted Capture Rate @ Top-K% ($\text{CR}_k$):**  
   Tỷ lệ phần trăm tổng chiều dài các đoạn đường có ngập thực tế được mô hình xếp vào nhóm $K\%$ đường có nguy cơ cao nhất:
   $$\text{CR}_k = \frac{\sum_{i \in \mathcal{P} \cap \text{Top}_k} \text{length}(i)}{\sum_{i \in \mathcal{P}} \text{length}(i)}$$
   Mục tiêu: Với Top $20\%$ chiều dài mạng lưới đường TP.HCM có điểm susceptibility cao nhất, mô hình phải bắt được $\ge 75\%$ các điểm ngập lịch sử đã ghi nhận.
2. **Area Under the Precision-Recall Curve (PR-AUC):** Độ đo chính để đánh giá sự phân tách giữa Presence và Background.
3. **ROC-AUC không gian (Spatial Block ROC-AUC):** Đánh giá khả năng khái quát hóa sang các quận/huyện chưa tham gia vào quá trình khớp tham số.
4. **Feature Importance (SHAP Values & Gain):** Xác minh tính hợp lý của các biến (ví dụ: `elevation_median_m` và `dist_water_m` phải có tầm quan trọng chi phối).

---

## 8. Hướng dẫn Tái lập Pipeline trên Google Colab & Local

Toàn bộ quy trình huấn luyện có thể được thực thi bằng Google Colab hoặc môi trường Python local thông qua `uv`:

```bash
# Cài đặt môi trường với uv
cd ml
uv sync

# Chạy pipeline trích xuất feature và huấn luyện baseline MCDA
uv run python scripts/run_pipeline.py --config configs/study_area.yaml

# Huấn luyện mô hình Track B Presence-Background
uv run python scripts/train.py --experiment track_b_pbg --ratio 10 --seed 42

# Đánh giá và xuất báo cáo kiểm định
uv run python scripts/evaluate_run.py --run-id latest --output reports/
```

Notebook Colab tương tác sẵn sàng tại `ml/notebooks/colab_first_workflow.ipynb`.

---

## 9. Cầu nối Tích hợp với Backend SaigonDrain (Inference Bridge)

Mô hình sau khi huấn luyện xuất ra file ánh xạ `ml/artifacts/road_susceptibility_scores.json` gồm danh sách các phân đoạn đường và chỉ số nguy cơ:
```json
{
  "version": "2.0.0",
  "generated_at": "2026-11-06T00:00:00Z",
  "scoring_method": "LightGBM-PU-Ensemble",
  "segments": [
    {
      "segment_id": "SEG_Q7_HUYNH_TAN_PHAT_01",
      "street": "Huỳnh Tấn Phát",
      "district": "Quận 7",
      "susceptibility_score": 0.88,
      "risk_level": "critical",
      "elevation_m": 0.95,
      "dist_water_m": 85.0,
      "primary_cause": "Triều cường & Mưa lớn kết hợp"
    }
  ]
}
```
Backend NestJS (`backend/src/modules/journey/services/journey.service.ts`) nạp bảng chỉ số này để tính toán trọng số né ngập chính xác cho từng mét đường di chuyển.
