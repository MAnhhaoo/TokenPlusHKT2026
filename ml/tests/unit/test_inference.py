"""CPU-only inference contracts; bundles are generated locally without training."""

import json

import numpy as np
import pandas as pd
import pytest
import torch

from flood_ml.inference import FloodSusceptibilityNet, FloodSusceptibilityPredictor


@pytest.fixture
def bundle(tmp_path):
    def create(*, prep=None, thresholds=None, fallback=False):
        preprocessing = {
            "feature_columns": ["elevation", "water", "builtup"],
            "scaler_mean": [10, 20, 0],
            "scaler_scale": [2, 0, 0.5],
            "imputation_medians": {"elevation": 12, "water": 25},
        }
        preprocessing.update(prep or {})
        model = FloodSusceptibilityNet(3, hidden_dim=64)
        with torch.no_grad():
            for parameter in model.parameters():
                parameter.zero_()
        checkpoint = {**preprocessing, "model_state_dict": model.state_dict()}
        (tmp_path / "model").mkdir(exist_ok=True)
        torch.save(
            checkpoint,
            tmp_path
            / ("best_model_a100.pt" if fallback else "model/best_model_a100.pt"),
        )
        if not fallback:
            (tmp_path / "preprocessing").mkdir(exist_ok=True)
            (tmp_path / "config").mkdir(exist_ok=True)
            (tmp_path / "preprocessing/preprocessing_config.json").write_text(
                json.dumps(preprocessing)
            )
            (tmp_path / "config/model_config.json").write_text(
                json.dumps(
                    {
                        "architecture": {"hidden_dim": 64},
                        "thresholds": thresholds
                        or {"top_5_pct": 0.75, "top_10_pct": 0.5, "top_20_pct": 0.25},
                    }
                )
            )
        return tmp_path

    return create


def test_preprocess_orders_features_imputes_and_handles_zero_scale(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(), device="cpu")
    source = pd.DataFrame(
        {
            "builtup": ["0.5", "invalid"],
            "water": [22, None],
            "elevation": ["14", "bad"],
            "extra": [99, 98],
        },
        index=[8, 3],
    )
    original = source.copy(deep=True)
    result = predictor.preprocess(source)
    np.testing.assert_array_equal(result, [[2, 2, 1], [1, 5, 0]])
    assert result.dtype == np.float32
    pd.testing.assert_frame_equal(source, original)


def test_missing_columns_use_median_then_zero(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(), device="cpu")
    np.testing.assert_array_equal(
        predictor.preprocess(pd.DataFrame(index=[9, 2])), [[1, 5, 0], [1, 5, 0]]
    )


def test_batch_single_prediction_and_input_metadata_are_preserved(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(), device="cpu")
    frame = pd.DataFrame(
        [
            {"elevation": 12, "water": 30, "builtup": 0.2},
            {"elevation": -2, "water": 1, "builtup": 0.9},
        ],
        index=[20, 10],
    )
    batch = predictor.predict_dataframe(frame)
    assert batch.index.tolist() == [20, 10]
    pd.testing.assert_frame_equal(batch[frame.columns], frame)
    assert not predictor.model.training
    for position, (_, row) in enumerate(frame.iterrows()):
        single = predictor.predict_single(row.to_dict())
        assert single["flood_susceptibility_prob"] == pytest.approx(
            batch.iloc[position].flood_susceptibility_prob
        )
        assert single["risk_tier"] == batch.iloc[position].risk_tier
    np.testing.assert_array_equal(batch.flood_susceptibility_prob, [0.5, 0.5])


@pytest.mark.parametrize(
    "thresholds,tier",
    [
        ({"top_5_pct": 0.5, "top_10_pct": 0.4, "top_20_pct": 0.3}, "Rất cao (Top 5%)"),
        ({"top_5_pct": 0.6, "top_10_pct": 0.5, "top_20_pct": 0.3}, "Cao (Top 10%)"),
        (
            {"top_5_pct": 0.7, "top_10_pct": 0.6, "top_20_pct": 0.5},
            "Trung bình (Top 20%)",
        ),
        ({"top_5_pct": 0.7, "top_10_pct": 0.6, "top_20_pct": 0.51}, "Thấp"),
    ],
)
def test_threshold_boundaries_are_inclusive(bundle, thresholds, tier):
    predictor = FloodSusceptibilityPredictor(
        bundle(thresholds=thresholds), device="cpu"
    )
    assert predictor.predict_single({}) == {
        "flood_susceptibility_prob": 0.5,
        "risk_tier": tier,
    }


def test_checkpoint_fallback_supplies_preprocessing_and_default_thresholds(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(fallback=True), device="cpu")
    assert predictor.feature_columns == ["elevation", "water", "builtup"]
    assert predictor.predict_single({})["risk_tier"] == "Cao (Top 10%)"


def test_empty_batch_returns_empty_result_with_output_columns(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(), device="cpu")
    result = predictor.predict_dataframe(pd.DataFrame(columns=["elevation"]))
    assert result.empty
    assert result.columns.tolist() == [
        "elevation",
        "flood_susceptibility_prob",
        "risk_tier",
    ]


def test_missing_checkpoint_is_rejected(tmp_path):
    with pytest.raises(FileNotFoundError):
        FloodSusceptibilityPredictor(tmp_path, device="cpu")


def test_invalid_preprocessing_json_is_rejected(bundle):
    root = bundle()
    (root / "preprocessing/preprocessing_config.json").write_text("{")
    with pytest.raises(json.JSONDecodeError):
        FloodSusceptibilityPredictor(root, device="cpu")


def test_incompatible_checkpoint_weights_are_rejected(bundle):
    root = bundle()
    checkpoint = torch.load(root / "model/best_model_a100.pt", weights_only=False)
    checkpoint["model_state_dict"] = {}
    torch.save(checkpoint, root / "model/best_model_a100.pt")
    with pytest.raises(RuntimeError, match="Missing key"):
        FloodSusceptibilityPredictor(root, device="cpu")


@pytest.mark.parametrize(
    "prep",
    [
        {"scaler_mean": [10]},
        {"scaler_scale": [1]},
        {"scaler_mean": [10, float("nan"), 0]},
        {"scaler_scale": [2, -1, 0.5]},
    ],
)
def test_malformed_scaler_bundle_is_rejected_before_scoring(bundle, prep):
    # Regression: scalar broadcasting can silently score a semantically invalid bundle.
    with pytest.raises(ValueError):
        FloodSusceptibilityPredictor(bundle(prep=prep), device="cpu")


def test_nonfinite_features_cannot_produce_nan_probability_with_low_risk(bundle):
    predictor = FloodSusceptibilityPredictor(bundle(), device="cpu")
    # A nonfinite feature must be rejected or imputed, never become NaN + "Thấp".
    try:
        result = predictor.predict_single({"elevation": float("inf")})
    except ValueError:
        return  # Explicit input rejection is also a valid finite-output policy.
    assert np.isfinite(result["flood_susceptibility_prob"])
