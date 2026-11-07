# Báo cáo kiểm thử toàn hệ thống — 07/11/2026

## Mốc và phạm vi

- Nguồn: `origin/master` tại `38d9d490805d835f2ce12dcfc473bb711df69b13`.
- Nhánh local: `codex/system-test-cases`; worktree `C:/Users/admin/Desktop/TokenPlus-system-tests`.
- Không sửa mã nghiệp vụ hoặc API/schema. Chỉ test, fixture, dependency/lệnh chạy kiểm thử và tài liệu.
- Workspace gốc giữ nguyên các thay đổi `pnpm-workspace.yaml` và `pnpm-lock.yaml`.
- Khảo sát source/config/test theo BE, admin, user, Android và ML; đối chiếu PRD/API_SPEC/SYSTEM_DESIGN/AI_SAFETY. Đã khảo sát entrypoint/module/component/API client/DTO/entity, test, cấu hình, notebook và pipeline ML theo phân hệ. Dataset/model binary chỉ đối chiếu manifest và schema, không chạy với dữ liệu nghiên cứu thật.

## Môi trường và cách đo

Windows PowerShell, Node 24.18.0, npm 11.16.0, Python 3.14.6. Các package Node cài độc lập trong worktree để không ghi đè lockfile đang sửa ở checkout gốc. Playwright dùng Chromium headless; API/SSE/GPS/provider là fixture. BE unit/HTTP nạp network guard; PostgreSQL integration dùng cấu hình riêng, không lấy `.env` production. ML dùng dữ liệu tổng hợp CPU và network guard/W&B disabled.

Runner tổng hợp: `npm run test:system`. Kết quả từng stage và stdout/stderr lưu dưới `.cache/system-tests/<run-id>/`; xem [README.md](README.md) để chạy chọn nhóm và chuẩn bị môi trường.

## Baseline trước khi bổ sung test

| Phân hệ | Kết quả baseline | Diễn giải |
|---|---|---|
| BE unit cũ | 4/4 đạt, 3 suite | Chưa có test role citizen, hash lỗi hoặc lớp bản đồ |
| BE E2E cũ | BLOCKED ở bootstrap; 21 test không tới assertion nghiệp vụ | `DB_TYPE=sqljs` vẫn chọn PostgreSQL; network guard chặn trước kết nối. Không tính 21 test này là lỗi nghiệp vụ riêng lẻ |
| Admin smoke cũ | FAIL assertion dữ liệu mock khởi tạo | Source mới đã tích hợp API, test cũ còn kỳ vọng 4 mock pending; ghi nhận test lỗi thời |
| User smoke và regression cũ | Đạt | Smoke cũ kiểm tra build/provenance; VM regression không thay thế browser |
| ML bằng Python toàn cục | BLOCKED — 15 lỗi collection thiếu dependency | Chưa đánh giá nghiệp vụ ở baseline môi trường này |
| ML baseline sau cài dependency | 571 đạt / 16 fail / 587 instance cũ | 4 ca pipeline mới deselect và inference mới không đưa vào baseline; lệnh cuối chạy toàn bộ |
| Android | NOT RUN | Chưa có Android SDK/adb/thiết bị; test mẫu không chứng minh chức năng |

## Kết quả tổng hợp

| Bộ | Kết quả đã xác minh | Bằng chứng |
|---|---|---|
| Typecheck + build BE/admin/user | 6/6 stage đạt | `.cache/system-tests/2026-11-07T12-04-57-285Z/summary.json` |
| BE unit | 38 đạt / 3 fail / 41 test, 13 suite | `.cache/system-tests/2026-11-07T12-04-57-285Z/be-unit.log` |
| BE HTTP Supertest | 6 đạt / 1 fail / 7 test | Cùng run: `be-http.log` |
| PostgreSQL | BLOCKED — 4 ca chưa chạy | Docker Desktop khởi tạo lỗi inference listener, không có daemon dùng được; Compose config validate đạt |
| Frontend browser | Admin 6 đạt / 8 fail / 14; user 8/8 đạt | `.cache/system-tests/2026-11-07T12-04-57-285Z/`; API/SSE/GPS fixture |
| ML toàn suite | 587 đạt / 21 fail / 608 instance; 336.97s | 16 fail cũ + 5 regression mới; không skip/deselect trong lượt cuối |
| Riêng ca ML mới | 16 đạt / 5 fail / 21 instance | Inference 12/17 đạt; pipeline mới 4/4 đạt |
| Android manual | NOT RUN — 16 ca đã soạn | [ANDROID_CASES.md](ANDROID_CASES.md) |

Lượt `npm run test:system` cuối trả **exit 1** đúng kỳ vọng khi còn test đỏ. Tổng số assertion test instance đã chạy: **645 đạt / 33 fail / 678** (không cộng 6 stage build/typecheck, không tính 4 ca DB bị chặn hoặc 16 ca Android chưa chạy). Có 16 fail thuộc ML cũ; 17 fail assertion còn lại thuộc test bổ sung, không đồng nghĩa 17 lỗi gốc độc lập. Bằng chứng hợp nhất: `.cache/system-tests/2026-11-07T12-04-57-285Z/summary.json`.

Sau rà soát cuối, fixture định tuyến được tăng độ chặt và ca ML infinity cho phép reject bằng ValueError hoặc impute hữu hạn; chạy lại có mục tiêu: journey 3/3 đạt, ca infinity vẫn fail với NaN, Ruff check/format đạt. Không đổi nghiệp vụ.

Không cộng baseline hoặc những lần rerun vào số test mới. Lỗi citizen token xuất hiện ở unit và HTTP nhưng là **một lỗi gốc**. Không báo “toàn bộ test xanh” khi còn regression đỏ hoặc stage BLOCKED.

## Lỗi đã tái hiện

| ID | Mức | Cách tái hiện / kỳ vọng | Hành vi quan sát | Test |
|---|---|---|---|---|
| BUG-BE-01 | P0 | Bật strict auth, dùng signed token role citizen gọi operator action; kỳ vọng 403 | Guard cho qua; PATCH approve trả 200 | `security.spec.ts` citizen regression và `controllers.http-spec.ts` citizen HTTP regression |
| BUG-BE-02 | P1 | Verify password bất kỳ với stored hash hỏng `zz:zz`; kỳ vọng false | Hàm trả true do giải mã hex thành key rỗng | `security.spec.ts` malformed stored password regression; không khẳng định ảnh hưởng hash hợp lệ |
| BUG-BE-03 | P1 | Điểm risk có ngưỡng 20mm, query chỉ lớp rain, mưa 60mm, giờ VN 12h; kỳ vọng không có flood | BE vẫn trả flood vì nhánh suy luận bỏ qua lớp đang tắt | `map.contract.spec.ts` BE-MAP03 |
| BUG-FE-01 | P0 | PATCH duyệt/từ chối/status hoặc POST/PATCH cảnh báo trả 503; kỳ vọng giữ state server và báo lỗi | Admin cập nhật state local và báo thành công dù server chưa lưu | FE-A06/A07/A08/A12-create/update/end (6 assertion fail) |
| BUG-FE-02 | P1 | Initial API trả 503 hoặc pending lâu; kỳ vọng phân biệt tải/lỗi với dữ liệu rỗng | Thiếu error alert và busy indicator, queue rỗng giống đã tải thành công | FE-A10/A11 |
| BUG-ML-01 | P0 | Bundle model 3 feature nhưng mean/scale một phần tử, mean NaN hoặc scale âm | Predictor vẫn nhận bundle sai, không ValueError | 4 biến thể `test_malformed_scaler_bundle_is_rejected_before_scoring` |
| BUG-ML-02 | P0 | Feature infinity; kỳ vọng reject/impute để không trả NaN | Xác suất NaN đi vào nhánh tier thấp | `test_nonfinite_features_cannot_produce_nan_probability_with_low_risk` |

Các lỗi frontend/ML và bằng chứng chi tiết được ghi trong [FE_RESULTS.md](FE_RESULTS.md), [ML_RESULTS.md](ML_RESULTS.md). Không sửa production và không thêm skip/xfail để che lỗi.

## Những điều chưa được xác nhận

- **PostgreSQL atomicity:** test kiểm tra rollback duyệt và tạo report khi ghi marker lỗi đã viết; không khẳng định DB thực sự rollback/pass khi daemon chưa chạy. Nhánh create có nghi vấn lưu nửa chừng, cần chạy ca DB để xác nhận.
- Không có browser nối BE thật trong một phiên xuyên suốt; HTTP, DB và browser fixture kiểm tra từng ranh giới độc lập.
- Không đo độ chính xác ML, thời gian định tuyến 1.5s, tải hệ thống, 60 FPS hay chất lượng tiles/GPS ngoài thực địa.
- Tài liệu API mô tả success envelope nhưng `TransformInterceptor` hiện chuyển tiếp raw data; test HTTP ghi nhận raw success payload và error envelope hiện tại. Cần chốt hợp đồng riêng trước khi đổi hành vi.
- Android sample instrumentation kỳ vọng package khác applicationId và Gradle chứa đường dẫn pnpm cụ thể; cần chuẩn bị/sync checkout native trước kiểm thử thiết bị.

## Bàn giao

Ma trận tổng: [TEST_CASES.md](TEST_CASES.md). Chi tiết BE/FE/ML có các bảng ID, dữ liệu, bước chạy, expected và tên test. Lệnh tổng hợp trả exit 1 khi có regression fail, exit 2 khi chỉ thiếu môi trường; BLOCKED/NOT RUN luôn được trình bày riêng.

Kiểm tra bàn giao: diff không thay đổi source nghiệp vụ; `git diff --cached --check` đạt. SHA-256 của hai file pnpm đang sửa ở workspace gốc trùng trước/sau. Browser harness dừng server theo process tree và chờ exit; không còn listener kiểm thử ở 5273/5274.
