# Kết quả kiểm thử frontend

Chạy ngày 07/11/2026 trên Windows, Node v24.18.0, Playwright 1.64.1 / Chromium headless. Mã production không thay đổi. Case chi tiết: [FE_CASES.md](FE_CASES.md).

## Lệnh tái chạy từ root

```powershell
npm --prefix FE/admin install --workspaces=false
npm --prefix FE/user install --workspaces=false
npm --prefix FE/admin run typecheck
npm --prefix FE/admin run build
npm --prefix FE/user run typecheck
npm --prefix FE/user run build
npm --prefix FE/user run test:smoke
npm --prefix FE/user run test:regressions
npm --prefix FE/admin run test:baseline
npm --prefix FE/admin run test:system
npm --prefix FE/user run test:system
```

Lần thiết lập dùng `npm install --workspaces=false --save-dev playwright@1.64.1` riêng trong từng thư mục FE; không cài bằng workspace root. Chromium đã có tại `C:/Users/admin/AppData/Local/ms-playwright`. Nếu máy khác chưa có browser, chạy `npx playwright install chromium` trong một package đã cài. Bộ system tự quản lý Vite, không cần backend hoặc khóa API; cần cổng 5273/5274 trống.

| Lệnh | Exit / kết quả |
| --- | --- |
| Admin typecheck | 0, đạt |
| Admin build | 0, đạt |
| User typecheck | 0, đạt |
| User build | 0, đạt; Vite cảnh báo chunk JS lớn hơn 500 kB |
| User test:smoke | 0, 2 bundled assets tồn tại |
| User test:regressions | 0; route ownership, giữ route khi refresh/lỗi, report retry, dialog focus, autocomplete cancellation, approximate location, native watch cleanup, weather availability |
| Admin test:baseline | 1; dừng ở assertion cũ `Overview has four pending reports` |
| Admin test:system | 1; 14 ca: 6 đạt, 8 lỗi regression; không skip/xfail |
| User test:system | 0; 8/8 đạt; không skip/xfail |

Output cuối: [admin](../../.cache/frontend-tests/FE_admin_test_output.txt), [user](../../.cache/frontend-tests/FE_user_test_output.txt). Baseline admin được giữ để ghi nhận lịch sử; nó giả định bốn mock report ngay khi mở trang, không còn đúng với app tải API hiện tại. Harness baseline hiện chặn cả `/api/*` và mạng ngoài nên không thể đi qua proxy tới backend thật. Không dùng kết quả baseline này để kết luận một lỗi nghiệp vụ mới.

## Lỗi xác nhận bằng browser

| Bug / ưu tiên | Ca tái hiện | Thực tế / mong đợi | Vị trí nguồn |
| --- | --- | --- | --- |
| FE-B01 / P0 | FE-A06, FE-A07 | PATCH 503 nhưng queue giảm 2 → 1 và báo thành công; phải giữ pending và cho phép xử lý lại | `FE/admin/src/App.tsx`: approveReport, rejectReport dùng fallback local khi apiResult null |
| FE-B02 / P0 | FE-A08 | PATCH status 503 nhưng bảng hiển thị Đã khóa; phải giữ trạng thái server | `FE/admin/src/App.tsx`: updateUserStatus fallback `{ ...user, status }` |
| FE-B03 / P0 | FE-A12-create/update/end | POST/PATCH 503 nhưng alert được tạo/sửa/kết thúc local; phải giữ dữ liệu đã được server xác nhận | `FE/admin/src/App.tsx`: saveAlert, endAlert fallback local |
| FE-B04 / P1 | FE-A10 | Toàn bộ tải API 503 không có role alert; app không phân biệt được lỗi tải với dữ liệu rỗng | `FE/admin/src/lib/api.ts`: fetchAdminInitialData; `App.tsx`: loadInitial không có error state |
| FE-B05 / P1 | FE-A11 | Request đang pending không có accessible busy/progress state; queue đã trình bày như hết báo cáo | `FE/admin/src/App.tsx`: state ban đầu rỗng; `ReportQueue.tsx`: empty state |

Các ca trên là ordinary failing tests để CI báo đỏ; không sửa kỳ vọng cho phù hợp bug, không sửa production để làm suite xanh. Các lỗi selector ban đầu (tên accessible chứa thông tin bổ sung, hidden input bản mobile, label kèm validation error) đã được sửa trong harness và không tính là lỗi sản phẩm.

## Diễn giải phạm vi

6 ca admin đạt: FE-A01/A02/A03/A04/A05/A09. 8 ca admin lỗi: FE-A06/A07/A08/A10/A11/A12-create/A12-update/A12-end. User đạt FE-U01 đến FE-U08. Mạng thật tới weather/geocoder/maps/OSRM/Google bị chặn trước khi gửi; riêng URL ArcGIS của FE-U07 được fulfill bằng payload tổng hợp. Các API chính là fixture trong browser, vì vậy kết quả không chứng minh tích hợp FE-BE thật hay độ chính xác provider. Consumer SSE được gọi bằng EventTarget, không chứng minh HTTP SSE server hoạt động. Không thu thập hoặc yêu cầu khóa API thật.

Lượt tổng hợp cuối qua root runner xác nhận lại đúng số liệu trên; log `.cache/system-tests/2026-11-07T12-04-57-285Z/admin-browser.log` và `user-browser.log`. Hạ tầng dừng server bằng process tree trên Windows và chờ exit; không giữ cổng sau khi hoàn tất.
