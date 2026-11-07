# Ca kiểm thử ML

Toàn bộ ca dùng fixture tạm tự tạo; không dùng dữ liệu nghiên cứu, huấn luyện, GPU hay dịch vụ ngoài. Điều kiện chung: cài dependency và nhóm `test`; chạy `.venv/Scripts/python.exe -m pytest tests -q` tại `ml`. Fixture toàn bộ suite chặn socket, xóa khóa W&B và đặt chế độ tracking disabled cho tiến trình CLI con. Các ca W&B chủ động thay SDK bằng đối tượng giả.

| Mã | Ưu tiên | Điều kiện / dữ liệu | Bước thực hiện | Kết quả mong đợi | Tham chiếu tự động |
|---|---|---|---|---|---|
| ML-INF-01 | P0 | Bundle CPU; thứ tự elevation/water/builtup; mean 10/20/0, scale 2/0/0.5, median 12/25 | Tiền xử lý cột đảo thứ tự, chuỗi số, chuỗi lỗi, null và cột thừa | Ma trận float32 `[[2,2,1],[1,5,0]]`, không đổi đầu vào; scale 0 an toàn | `ml/tests/unit/test_inference.py::test_preprocess_orders_features_imputes_and_handles_zero_scale` |
| ML-INF-02 | P0 | Bundle trên; hai dòng thiếu toàn bộ đặc trưng | Tiền xử lý | Điền median rồi mặc định 0; giữ số dòng | `test_missing_columns_use_median_then_zero` |
| ML-INF-03 | P0 | Checkpoint CPU trọng số 0, hai dòng có index riêng | Dự đoán batch và từng dòng | Xác suất 0.5 và tier khớp; giữ index/cột đầu vào; model ở eval | `test_batch_single_prediction_and_input_metadata_are_preserved` |
| ML-INF-04 | P0 | Xác suất 0.5, bốn cấu hình ngưỡng | Dự đoán đúng ngưỡng cao/vừa/thấp và dưới ngưỡng thấp | Phép so sánh bao gồm giá trị bằng ngưỡng, phân tầng đúng | `test_threshold_boundaries_are_inclusive` (4 biến thể) |
| ML-INF-05 | P1 | Chỉ checkpoint tại thư mục gốc, metadata nhúng | Nạp và dự đoán | Dùng preprocessing trong checkpoint, tier mặc định | `test_checkpoint_fallback_supplies_preprocessing_and_default_thresholds` |
| ML-INF-06 | P1 | Bundle hợp lệ, bảng đầu vào rỗng | Dự đoán batch | Bảng rỗng chứa cột gốc và cột kết quả | `test_empty_batch_returns_empty_result_with_output_columns` |
| ML-INF-07 | P0 | Thiếu checkpoint | Khởi tạo predictor | FileNotFoundError, không trả điểm | `test_missing_checkpoint_is_rejected` |
| ML-INF-08 | P0 | Checkpoint hợp lệ; JSON preprocessing lỗi | Khởi tạo predictor | JSONDecodeError, không trả điểm | `test_invalid_preprocessing_json_is_rejected` |
| ML-INF-09 | P0 | Checkpoint thiếu trọng số | Khởi tạo predictor | RuntimeError báo thiếu key | `test_incompatible_checkpoint_weights_are_rejected` |
| ML-INF-10 | P0 | Model 3 đặc trưng; mean/scale dài 1, mean NaN hoặc scale âm | Nạp bundle | Từ chối cấu hình sai trước khi tính điểm; giữ ca hồi quy đỏ khi chưa có validation | `test_malformed_scaler_bundle_is_rejected_before_scoring` (4 biến thể) |
| ML-INF-11 | P0 | Bundle hợp lệ, đặc trưng infinity | Dự đoán một dòng | Xác suất hữu hạn; không được trả NaN kèm nguy cơ thấp | `test_nonfinite_features_cannot_produce_nan_probability_with_low_risk` |
| ML-PIPE-01 | P1 | AOI, OSM, raster, bằng chứng và nước tổng hợp nhỏ | Chỉ chạy target features | Chạy dependency; trạng thái partial, evaluation not_run; không có marker hoàn tất toàn bộ hay lock dư | `ml/tests/integration/test_pipeline.py::test_partial_pipeline_does_not_claim_full_completion` |
| ML-PIPE-02 | P1 | Settings tổng hợp, marker hoàn tất đã tồn tại | Yêu cầu stage trùng hoặc không tồn tại | PipelineError; marker cũ nguyên vẹn; không tạo lock | `test_invalid_stage_plan_preserves_existing_completion` (2 biến thể) |
| ML-PIPE-03 | P1 | Stage roads tổng hợp đã xong | Làm hỏng JSON marker rồi chạy lại | Tái tạo stage, marker complete hợp lệ, giải phóng lock | `test_corrupt_stage_marker_rebuilds_outputs` |

Các suite sẵn có bao phủ checksum/đầu vào chỉ đọc, fingerprint nguồn/cấu hình, hỏng đầu ra và tái chạy stage phụ thuộc, cổng duyệt nhãn, rò rỉ không gian holdout, sampling tái lập, chuẩn hóa MCDA, mask/CRS raster, tính toàn vẹn công bố, provenance CLI và replay pipeline offline. Không thay đổi chính sách dữ liệu thật.
