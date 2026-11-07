# Kết quả kiểm thử ML

Ngày chạy: 2026-11-07. Windows, Python 3.14.6; máy chỉ có Python 3.14, khác Python 3.12 trong tài liệu ML. Không chạy training, GPU, dữ liệu nghiên cứu hoặc dịch vụ ngoài. Không sửa mã nghiệp vụ.

## Baseline trước bổ sung

Lệnh tại gốc repo: `python -m pytest ml/tests -q`.

Kết quả: **15 lỗi collection, exit 1, 29.06s**, chưa chạy test. Thiếu `geopandas` trong Python hệ thống; 15 module phụ thuộc GIS không import được. `torch` cũng chưa cài nhưng suite cũ chưa import inference.

## Thiết lập và kiểm tra tĩnh

Tạo venv bằng `python -m venv ml/.venv`. Thử pip cài dependency; chuyển sang uv do tải tuần tự chậm. Lệnh chuẩn tại `ml`: `python -m uv sync --locked --group dev --group test --python 3.14`. Nhóm `test` chứa pytest/torch; `dev` bao gồm nhóm `test` để CI hiện hữu vẫn collection được inference. Torch dùng index CPU riêng; dependency production giữ nguyên. Lock được cập nhật.

- `python -m compileall -q ml/tests`: đạt.
- `python -m uv run --no-project --with ruff ruff check ml/tests/conftest.py ml/tests/unit/test_inference.py ml/tests/integration/test_pipeline.py`: đạt.
- `python -m uv run --no-project --with ruff ruff format --check tests/unit/test_inference.py tests/conftest.py tests/integration/test_pipeline.py` tại `ml`: đạt, 3 file.
- `python -m uv lock --check --python 3.14` tại `ml`: đạt, 84 package.

## Phạm vi bổ sung

17 instance inference, 4 instance pipeline (21 tổng cộng). Danh mục, mức P0/P1, điều kiện, dữ liệu, bước và mong đợi xem `ML_CASES.md`. Fixture offline áp dụng toàn suite: chặn socket, không dùng W&B thật, CLI con nhận chế độ disabled và không có khóa API.

## Thực thi cuối

Provisioning đã hoàn tất bằng uv: 75 package, torch 2.15.0+cpu; numpy 2.5.4, pandas 3.1.0, geopandas 1.2.0, rasterio 1.5.2, scikit-learn 1.9.1, pyarrow 26.0.0, pytest 9.2.0. Không có dependency bị chặn. Không đánh dấu skip/xfail cho ca hồi quy.

Lệnh tại `ml`: `.venv/Scripts/python.exe -m pytest tests/unit/test_inference.py -q`.

Kết quả **12 passed, 5 failed, 26.94s, exit 1**. Lỗi mới đã xác nhận:

- P0: `test_malformed_scaler_bundle_is_rejected_before_scoring[prep0]`: mean chỉ 1 phần tử cho model 3 đặc trưng vẫn được chấp nhận.
- P0: `[prep1]`: scale chỉ 1 phần tử vẫn được chấp nhận; NumPy broadcast có thể tạo điểm sai âm thầm.
- P0: `[prep2]`: mean chứa NaN không bị từ chối.
- P0: `[prep3]`: scale âm không bị từ chối.
- P0: `test_nonfinite_features_cannot_produce_nan_probability_with_low_risk`: đặc trưng infinity trả xác suất NaN. Các phép so sánh NaN đều false nên production xếp vào tier thấp.

Lệnh tại `ml`: `.venv/Scripts/python.exe -m pytest tests/integration/test_pipeline.py -k 'partial_pipeline_does_not_claim_full_completion or invalid_stage_plan_preserves_existing_completion or corrupt_stage_marker_rebuilds_outputs' -q --tb=short`.

Kết quả **4 passed, 9 deselected, 13.42s, exit 0**. Cả 21 instance mới được thực thi: 16 đạt, 5 lỗi hồi quy. Không sửa nghiệp vụ để làm xanh test. Không dùng kết quả tổng hợp để khẳng định chất lượng hoặc độ chính xác mô hình trên dữ liệu thật.

## Baseline có thể chạy khi chờ GIS

Lệnh tại `ml`: `python -m pytest tests/unit/test_config_run.py tests/unit/test_notebook_hygiene.py tests/unit/test_wandb_tracking.py tests/unit/test_git_eol_policy.py tests/unit/test_ci_workflow.py -q`.

Kết quả **75 passed, 15 failed, 6.03s, exit 1**. Đây là test sẵn có, không gồm ca inference/pipeline mới. Các lỗi xác nhận:

- `test_config_run.py::test_run_provenance_and_reuse`: kỳ vọng Git commit/dirty null nhưng mã trả `local_drive`/false.
- `test_ci_workflow.py::test_ci_matrix_contains_windows_and_linux_and_uses_locked_commands`: thiếu `ml/.github/workflows/ci.yml`.
- `test_notebook_hygiene.py::test_notebook_contains_no_credentials_or_user_data_paths`: notebook import pandas/geopandas/yaml, trái hợp đồng hygiene cũ.
- `test_notebook_pins_source_and_uses_uv_project_environment`.
- `test_notebook_bootstrap_and_windows_replay_parse_real_uv_release_output`.
- `test_notebook_keeps_missing_reviews_pending_and_only_passes_ready_track_b_scores[ready-True]`.
- `test_notebook_keeps_missing_reviews_pending_and_only_passes_ready_track_b_scores[pending_positive_review-False]`.
- `test_notebook_keeps_missing_reviews_pending_and_only_passes_ready_track_b_scores[background_pool_insufficient-False]`.
- `test_notebook_documents_same_snapshot_replay_in_separate_checkout`.
- `test_notebook_colab_secret_is_private_to_project_children[available]`.
- `test_notebook_colab_secret_is_private_to_project_children[missing]`.
- `test_notebook_colab_secret_is_private_to_project_children[denied]`.
- `test_notebook_colab_secret_is_private_to_project_children[empty]`.
- `test_notebook_colab_secret_is_private_to_project_children[outside_colab]`.
- `test_notebook_bootstrap_does_not_forward_inherited_wandb_key`.

Các tên không kèm file trong danh sách thuộc `test_notebook_hygiene.py`; đây là chênh lệch hợp đồng notebook hiện tại và suite cũ, chưa phải bằng chứng notebook gọi dịch vụ thật trong lần chạy này.

## Baseline đầy đủ sau cài dependency

Lệnh tại `ml`:

```powershell
.venv/Scripts/python.exe -m pytest tests --ignore=tests/unit/test_inference.py -k 'not partial_pipeline_does_not_claim_full_completion and not invalid_stage_plan_preserves_existing_completion and not corrupt_stage_marker_rebuilds_outputs' -q --tb=short
```

Kết quả **571 passed, 16 failed, 4 deselected, 396.46s (6:36), exit 1**. Toàn bộ 587 instance cũ được chạy; 4 deselected là instance pipeline mới và 17 inference mới bị loại bằng `--ignore`, chỉ để đo baseline. Lệnh cuối toàn suite không dùng các bộ lọc này.

Ngoài 15 lỗi baseline nhỏ nêu trên, xác nhận thêm lỗi cũ `tests/unit/test_matching_reviews.py::test_completeness_rejects_ambiguous_nonboolean_assertion[TRUE]`: chuỗi `TRUE` không bị từ chối bằng PipelineError như hợp đồng test đòi hỏi. Không sửa production để che lỗi.

Log baseline chi tiết cục bộ: `ml/.venv/baseline-results.txt` (ignored, không đưa vào Git). Full suite cuối được root runner chạy cùng các tầng khác; số liệu full run cuối nằm trong báo cáo tổng hợp của runner. Không suy diễn số pass/fail full run từ các lần chạy riêng.

## Lượt tổng hợp cuối

Root `npm run test:system` gọi `.venv/Scripts/python.exe -m pytest tests -q` trong `ml`, không ignore/deselect/skip/xfail: **587 passed, 21 failed, 336.97s**, exit 1. Trong 21 fail có 16 fail cũ và 5 fail regression mới. Log: `.cache/system-tests/2026-11-07T12-04-57-285Z/ml-pytest.log`.

Rà soát cuối cho phép ca infinity chấp nhận validation ValueError hoặc kết quả impute hữu hạn, đúng hợp đồng. Chạy riêng sau chỉnh test vẫn fail với xác suất NaN; Ruff check/format đạt. Không sửa source inference.
