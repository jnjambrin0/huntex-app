#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib


ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "model.joblib"


def load_model() -> Tuple[Any, List[str], Dict[int, str]]:
    try:
        bundle = joblib.load(MODEL_PATH)
    except Exception as exc:  # pragma: no cover - defensive logging
        raise RuntimeError(f"Failed to load model from {MODEL_PATH}: {exc}") from exc

    model = bundle.get("model")
    feature_names = bundle.get("feature_names")
    class_labels = bundle.get("class_labels")

    if model is None or feature_names is None or class_labels is None:
        raise RuntimeError("Model bundle missing required keys: model, feature_names, class_labels")

    index_to_label = {index: label for label, index in class_labels.items()}
    return model, feature_names, index_to_label


def ensure_features(data: Dict[str, Any], feature_names: List[str]) -> List[float]:
    values: List[float] = []
    missing: List[str] = []

    for name in feature_names:
        raw_value = data.get(name)
        if raw_value in ("", None):
            missing.append(name)
            continue

        try:
            values.append(float(raw_value))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Feature '{name}' expects a numeric value, received '{raw_value}'.") from exc

    if missing:
        raise ValueError(f"Missing required feature(s): {', '.join(missing)}.")

    return values


def predict_single(payload: Dict[str, Any]) -> Dict[str, Any]:
    model, feature_names, index_to_label = load_model()
    features = ensure_features(payload, feature_names)

    predicted_index = int(model.predict([features])[0])
    label = index_to_label.get(predicted_index)
    if label is None:
        raise RuntimeError(f"Predicted class index {predicted_index} not found in label map.")

    return {"label": label}


def normalise_headers(fieldnames: List[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for name in fieldnames:
        canonical = name.strip().lower()
        mapping[canonical] = name
    return mapping


def predict_bulk(csv_path: Path) -> Dict[str, Any]:
    model, feature_names, index_to_label = load_model()

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSV file is missing a header row.")

        header_map = normalise_headers(reader.fieldnames)
        missing_columns = [name for name in feature_names if name.lower() not in header_map]
        if missing_columns:
            raise ValueError(
                "CSV file is missing required columns: " + ", ".join(missing_columns)
            )

        entries: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []

        for idx, row in enumerate(reader):
            row_payload = {name: row.get(header_map[name.lower()], "") for name in feature_names}
            try:
                features = ensure_features(row_payload, feature_names)
                predicted_index = int(model.predict([features])[0])
                label = index_to_label.get(predicted_index, "UNKNOWN")
                entries.append({"row": idx, "label": label})
            except Exception as exc:  # capture row-specific issues
                errors.append({"row": idx, "message": str(exc)})

        return {"entries": entries, "errors": errors}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run predictions using the HuntEX model.")
    parser.add_argument("--mode", choices={"single", "bulk"}, required=True)
    parser.add_argument("--data", help="JSON payload for single mode.")
    parser.add_argument("--csv", type=Path, help="CSV file path for bulk mode.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        if args.mode == "single":
            if not args.data:
                raise ValueError("Single mode requires the --data argument.")
            payload = json.loads(args.data)
            result = predict_single(payload)
        else:
            if not args.csv:
                raise ValueError("Bulk mode requires the --csv argument.")
            if not args.csv.exists():
                raise FileNotFoundError(f"CSV file not found: {args.csv}")
            result = predict_bulk(args.csv)
    except Exception as exc:
        sys.stdout.write(json.dumps({"error": str(exc)}))
        return 1

    sys.stdout.write(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
