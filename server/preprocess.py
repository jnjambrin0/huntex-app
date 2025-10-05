#!/usr/bin/env python3
"""
CSV Preprocessing Pipeline for Raw Kepler Data

Adapts the training pipeline from Improved-RF/data.py for inference on user-uploaded CSVs.
This module ensures uploaded data undergoes IDENTICAL transformations as the training data.

KEY DIFFERENCES FROM data.py:
- Does NOT expect 'koi_disposition' column (label/target)
- Does NOT expect 'kepoi_name' column (exoplanet name identifier)
- Accepts CSVs with extra columns (ignores them gracefully)
- Uses pre-calculated medians from training set for missing value imputation

CRITICAL: Any changes to the training pipeline in Improved-RF/data.py MUST be reflected here
to maintain prediction accuracy.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
STATS_PATH = SCRIPT_DIR / "training_stats.json"


class PreprocessingError(Exception):
    """Error durante el preprocesamiento."""
    pass


def load_training_stats() -> Dict:
    """Carga estadísticas del dataset de entrenamiento."""
    if not STATS_PATH.exists():
        raise FileNotFoundError(
            f"Training stats not found: {STATS_PATH}\n"
            "Run Improved-RF/extract_training_stats.py first."
        )

    with open(STATS_PATH, 'r') as f:
        return json.load(f)


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names to handle case variations and whitespace.
    Examples: 'KOI_PERIOD', ' koi_period ', 'Koi_Period' → 'koi_period'
    """
    df.columns = df.columns.str.strip().str.lower()
    return df


def is_already_preprocessed(df: pd.DataFrame) -> bool:
    """
    Detect if CSV is already log-transformed (pre-processed) vs raw Kepler data.

    Detection strategy: Check value ranges of log-transformed features.
    - Pre-processed: Values in log scale (e.g., koi_period: -3 to 3)
    - Raw: Values in original scale (e.g., koi_period: 0.2 to 730 days)

    Why this works:
    - log10(0.2) = -0.7, log10(730) = 2.86  → log range: -0.7 to 2.86
    - Raw range: 0.2 to 730                 → vastly different!

    Returns: True if already preprocessed, False if raw data
    """
    # Features that undergo log transformation
    log_features = ['koi_period', 'koi_depth', 'koi_prad', 'koi_insol', 'koi_srad', 'koi_model_snr']

    # Check if log features exist
    available_log_features = [f for f in log_features if f in df.columns]
    if len(available_log_features) == 0:
        return False  # Can't determine, assume raw

    # Analyze value ranges
    indicators = 0
    total_checks = 0

    for feat in available_log_features:
        values = df[feat].dropna()
        if len(values) == 0:
            continue

        min_val = values.min()
        max_val = values.max()
        total_checks += 1

        # Check ranges for each feature
        # Strategy: Use strict upper bounds to detect log-transformed data
        # If ANY value exceeds the log-scale upper bound, it's definitely raw
        if feat == 'koi_period':
            # Log range: -0.7 to 2.86 | Raw range: 0.2 to 730
            # Upper bound: log10(730) = 2.86, so max_val > 3.5 → definitely raw
            if max_val <= 3.5 and min_val >= -1.5:
                indicators += 1
        elif feat == 'koi_depth':
            # Log range: 1.0 to 5.0 | Raw range: 10 to 100,000
            # Upper bound: log10(100000) = 5, so max_val > 6 → definitely raw
            if max_val <= 6.0 and min_val >= 0.0:
                indicators += 1
        elif feat == 'koi_prad':
            # Log range: -0.3 to 1.5 | Raw range: 0.5 to 30
            # Upper bound: log10(30) = 1.48, so max_val > 2.5 → definitely raw
            if max_val <= 2.5 and min_val >= -1.0:
                indicators += 1
        elif feat == 'koi_insol':
            # Log range: -1.5 to 3.0 | Raw range: 0.03 to 1000
            # Upper bound: log10(1000) = 3, so max_val > 4 → definitely raw
            if max_val <= 4.0 and min_val >= -2.0:
                indicators += 1
        elif feat == 'koi_srad':
            # Log range: -0.5 to 0.5 | Raw range: 0.3 to 3
            # Upper bound: log10(3) = 0.48, so max_val > 1.5 → definitely raw
            if max_val <= 1.5 and min_val >= -1.0:
                indicators += 1
        elif feat == 'koi_model_snr':
            # Log range: -1.0 to 4.0 | Raw range: 0.1 to 10000
            # Upper bound: log10(10000) = 4, so max_val > 5 → definitely raw
            if max_val <= 5.0 and min_val >= -2.0:
                indicators += 1

    # If >= 50% of checks indicate preprocessed data, classify as preprocessed
    if total_checks == 0:
        return False

    confidence = indicators / total_checks
    return confidence >= 0.5


def validate_required_features(df: pd.DataFrame, required: List[str]) -> Tuple[bool, List[str]]:
    """
    Verifica que el CSV contenga las features requeridas mínimas.
    Returns: (es_valido, features_faltantes)
    """
    missing = [feat for feat in required if feat not in df.columns]
    return len(missing) == 0, missing


def remove_leakage_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Elimina features que causan data leakage.
    Estas NO deben enviarse al modelo.
    """
    leakage_features = ['koi_score', 'koi_pdisposition']

    for feat in leakage_features:
        if feat in df.columns:
            df = df.drop(columns=[feat])

    return df


def validate_physical_ranges(df: pd.DataFrame, stats: Dict) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Validate physical plausibility of exoplanet parameters and remove invalid rows.

    Ranges based on known exoplanet physics and Kepler mission constraints.
    Source: Improved-RF/data.py:164-205

    Returns: (cleaned_dataframe, per_row_errors)
    """
    valid_ranges = stats['valid_ranges']
    errors = []
    mask = pd.Series([True] * len(df), index=df.index)

    # Orbital period: 0.2 - 730 days
    # Lower bound: Roche limit for gas giants (~0.2 days)
    # Upper bound: 2 years (Kepler mission design limit)
    if 'koi_period' in df.columns:
        min_val, max_val = valid_ranges['koi_period']
        invalid = (df['koi_period'] <= min_val) | (df['koi_period'] > max_val)
        for idx in df[invalid].index:
            errors.append({
                'row': int(idx),
                'message': f'koi_period out of range [{min_val}, {max_val}]'
            })
        mask &= ~invalid

    # Planet radius: 0.5 - 30 R_earth
    # Lower bound: Smaller than Mercury (detection limit)
    # Upper bound: Larger than Jupiter is rare but possible (brown dwarf boundary)
    if 'koi_prad' in df.columns:
        min_val, max_val = valid_ranges['koi_prad']
        invalid = (df['koi_prad'] < min_val) | (df['koi_prad'] > max_val)
        for idx in df[invalid].index:
            errors.append({
                'row': int(idx),
                'message': f'koi_prad out of range [{min_val}, {max_val}] R_earth'
            })
        mask &= ~invalid

    # Transit depth: 10 - 100,000 ppm
    # Parts per million decrease in star brightness during transit
    # Lower bound: Kepler detection sensitivity limit
    # Upper bound: Unphysically large transit (would be stellar eclipse)
    if 'koi_depth' in df.columns:
        min_val, max_val = valid_ranges['koi_depth']
        invalid = (df['koi_depth'] < min_val) | (df['koi_depth'] > max_val)
        for idx in df[invalid].index:
            errors.append({
                'row': int(idx),
                'message': f'koi_depth out of range [{min_val}, {max_val}] ppm'
            })
        mask &= ~invalid

    # Equilibrium temperature: 100 - 3000 K
    # Lower bound: Colder than ice giants (detection/modeling limit)
    # Upper bound: Hotter than ultra-hot Jupiters (stellar companion territory)
    if 'koi_teq' in df.columns:
        min_val, max_val = valid_ranges['koi_teq']
        invalid = (df['koi_teq'] < min_val) | (df['koi_teq'] > max_val)
        for idx in df[invalid].index:
            errors.append({
                'row': int(idx),
                'message': f'koi_teq out of range [{min_val}, {max_val}] K'
            })
        mask &= ~invalid

    # Physical constraint: Planet radius cannot exceed star radius
    # Conversion: 1 R_sun = 109.1 R_earth
    if {'koi_prad', 'koi_srad'}.issubset(df.columns):
        invalid = df['koi_prad'] > (df['koi_srad'] * 109.1)
        for idx in df[invalid].index:
            errors.append({
                'row': int(idx),
                'message': 'koi_prad > koi_srad (planet larger than star)'
            })
        mask &= ~invalid

    return df[mask].copy(), errors


def impute_missing_values(df: pd.DataFrame, required_features: List[str],
                          optional_features: List[str], stats: Dict) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Handle missing values using training set statistics.

    Strategy:
    - Required features (koi_period, koi_depth, koi_duration, koi_prad):
      If missing → reject row (cannot predict without fundamental parameters)
    - Optional features (koi_teq, koi_insol, stellar params):
      If missing → impute with median from 50,858 training samples

    Why pre-calculated medians: Ensures consistency across all CSV uploads.
    Using batch medians would cause predictions to vary based on upload batch composition.

    Source: training_stats.json (generated by Improved-RF/extract_training_stats.py)

    Returns: (imputed_dataframe, per_row_errors)
    """
    medians = stats['medians_pretransform']
    errors = []

    # Check required features - row rejected if missing
    for feat in required_features:
        if feat not in df.columns:
            continue

        missing_mask = df[feat].isna()
        if missing_mask.any():
            for idx in df[missing_mask].index:
                errors.append({
                    'row': int(idx),
                    'message': f'Required feature {feat} is missing'
                })

    # Remove rows with missing required features
    df = df.dropna(subset=[f for f in required_features if f in df.columns])

    # Impute optional features with training median
    for feat in optional_features:
        if feat not in df.columns:
            continue

        if df[feat].isna().any():
            median_val = medians.get(feat)
            if median_val is not None:
                df[feat] = df[feat].fillna(median_val)

    return df, errors


def apply_log_transforms(df: pd.DataFrame, stats: Dict) -> pd.DataFrame:
    """
    Apply log10 transformations to features with extreme skewness.

    CRITICAL: Must apply IDENTICAL transformations as training pipeline.
    Transformed features: koi_period, koi_depth, koi_prad, koi_insol, koi_srad, koi_model_snr

    Example: koi_period=2.47 days → log10(2.47) = 0.393

    Why log transform: These features span multiple orders of magnitude (e.g., periods from
    0.2 to 730 days). Log transform normalizes distributions for better model performance.

    Implementation note: Column is transformed in-place (same name) to maintain compatibility
    with model.joblib's expected feature names.
    """
    log_features = stats['log_transform_features']

    for feat in log_features:
        if feat not in df.columns:
            continue

        # Only transform positive values (log10 undefined for ≤0)
        mask = df[feat] > 0
        if mask.sum() == 0:
            continue

        # Create temporary log column
        new_col = f'log_{feat}'
        df[new_col] = np.nan
        df.loc[mask, new_col] = np.log10(df.loc[mask, feat])

        # Replace original column with log-transformed values
        df = df.drop(columns=[feat])
        df = df.rename(columns={new_col: feat})

    return df


def remove_extreme_outliers(df: pd.DataFrame, features: List[str]) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Elimina outliers extremos POST-transformación usando 5*IQR.
    Returns: (df_limpio, errores_por_fila)
    """
    errors = []
    mask = pd.Series([True] * len(df), index=df.index)

    for feat in features:
        if feat not in df.columns:
            continue

        data = df[feat].dropna()
        if len(data) == 0:
            continue

        # 5*IQR (muy permisivo, solo elimina extremos)
        Q1 = data.quantile(0.25)
        Q3 = data.quantile(0.75)
        IQR = Q3 - Q1

        lower = Q1 - 5 * IQR
        upper = Q3 + 5 * IQR

        invalid = (df[feat] < lower) | (df[feat] > upper)
        if invalid.any():
            for idx in df[invalid].index:
                errors.append({
                    'row': int(idx),
                    'message': f'{feat} is extreme outlier (5*IQR)'
                })
            mask &= ~invalid

    return df[mask].copy(), errors


def preprocess_csv(
    input_csv_path: Path,
    output_csv_path: Path,
    stats: Dict
) -> Dict:
    """
    Complete preprocessing pipeline for raw Kepler CSVs.

    Orchestrates all preprocessing steps in the correct order to ensure data matches
    the training distribution exactly. Steps execute sequentially to maintain data integrity.

    Pipeline order (CRITICAL - do not reorder):
    1. Load CSV → 2. Normalize columns → 3. Validate required columns exist →
    4. Remove leakage features → 5. Remove duplicates → 6. Validate physical ranges →
    7. Impute missing values → 8. Apply log transforms → 9. Remove outliers →
    10. Select final features → 11. Save processed CSV

    Args:
        input_csv_path: Raw CSV from user upload
        output_csv_path: Destination for processed CSV (ready for model.joblib)
        stats: Training statistics from training_stats.json

    Returns:
        Dictionary with preprocessing statistics and per-row errors:
        {
            'success': bool,
            'original_rows': int,
            'processed_rows': int,
            'removed_rows': int,
            'errors': [{'row': int, 'message': str}, ...],
            'warnings': [str, ...]
        }
    """
    # Model expects exactly these 11 features in this order
    required_features = ['koi_period', 'koi_depth', 'koi_duration', 'koi_prad']
    optional_features = [
        'koi_teq', 'koi_insol', 'koi_steff', 'koi_slogg',
        'koi_srad', 'koi_model_snr', 'koi_impact'
    ]
    all_features = required_features + optional_features

    # Initialize result tracking
    result = {
        'success': False,
        'original_rows': 0,
        'processed_rows': 0,
        'removed_rows': 0,
        'errors': [],
        'warnings': []
    }

    try:
        # 1. Load CSV
        df = pd.read_csv(input_csv_path, comment='#')
        result['original_rows'] = len(df)

        if len(df) == 0:
            raise PreprocessingError("CSV file is empty")

        # 2. Normalize column names
        df = normalize_column_names(df)

        # 3. CRITICAL: Detect if CSV is already preprocessed
        already_preprocessed = is_already_preprocessed(df)

        if already_preprocessed:
            # CSV is already in log scale - skip preprocessing
            result['warnings'].append(
                'CSV detected as pre-processed (log-transformed). '
                'Skipping normalization and transformations.'
            )

            # Validate required columns exist
            is_valid, missing = validate_required_features(df, required_features)
            if not is_valid:
                raise PreprocessingError(
                    f"CSV missing required columns: {', '.join(missing)}"
                )

            # Select only model features and save directly
            available_features = [f for f in all_features if f in df.columns]
            df = df[available_features]
            df.to_csv(output_csv_path, index=False)

            result['processed_rows'] = len(df)
            result['removed_rows'] = 0
            result['success'] = True
            return result

        # 4. Validate required features exist
        is_valid, missing = validate_required_features(df, required_features)
        if not is_valid:
            raise PreprocessingError(
                f"CSV missing required columns: {', '.join(missing)}"
            )

        # 5. Remove leakage features
        df = remove_leakage_features(df)

        # 6. Remove duplicates by kepoi_name (if exists)
        if 'kepoi_name' in df.columns:
            before = len(df)
            df = df.drop_duplicates(subset='kepoi_name', keep='first')
            after = len(df)
            if before > after:
                result['warnings'].append(
                    f'Removed {before - after} duplicate kepoi_name entries'
                )

        # 7. Validate physical ranges
        df, range_errors = validate_physical_ranges(df, stats)
        result['errors'].extend(range_errors)

        # 8. Impute missing values
        df, imputation_errors = impute_missing_values(
            df, required_features, optional_features, stats
        )
        result['errors'].extend(imputation_errors)

        # 9. Apply log transformations (CRITICAL for raw data)
        df = apply_log_transforms(df, stats)

        # 10. Remove extreme outliers post-transformation
        df, outlier_errors = remove_extreme_outliers(df, all_features)
        result['errors'].extend(outlier_errors)

        # 11. Select only model-expected features
        available_features = [f for f in all_features if f in df.columns]
        df = df[available_features]

        # 12. Save processed CSV
        df.to_csv(output_csv_path, index=False)

        result['processed_rows'] = len(df)
        result['removed_rows'] = result['original_rows'] - result['processed_rows']
        result['success'] = True

    except PreprocessingError as e:
        result['errors'].append({'row': -1, 'message': str(e)})
    except Exception as e:
        result['errors'].append({'row': -1, 'message': f'Unexpected error: {str(e)}'})

    return result


def main() -> int:
    """CLI para preprocesamiento."""
    parser = argparse.ArgumentParser(description="Preprocess raw CSV for HuntEX model")
    parser.add_argument('--input', type=Path, required=True, help='Input raw CSV path')
    parser.add_argument('--output', type=Path, required=True, help='Output processed CSV path')
    args = parser.parse_args()

    try:
        stats = load_training_stats()
        result = preprocess_csv(args.input, args.output, stats)

        # Imprimir resultado como JSON
        sys.stdout.write(json.dumps(result))

        return 0 if result['success'] else 1

    except Exception as e:
        error_result = {
            'success': False,
            'errors': [{'row': -1, 'message': str(e)}]
        }
        sys.stdout.write(json.dumps(error_result))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
