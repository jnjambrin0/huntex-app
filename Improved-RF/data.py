"""
Módulo de datos con correcciones críticas.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from typing import Dict, Tuple, Optional, List
import logging
from pathlib import Path
import json

from config import DataConfig

logger = logging.getLogger(__name__)


class DataQualityAnalyzer:
    """
    Analiza calidad del dataset y detecta problemas.
    """

    def __init__(self, save_dir: str = 'diagnostics'):
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(exist_ok=True)
        self.report = {}

    def analyze(self, df: pd.DataFrame, features: List[str]) -> Dict:
        """Análisis completo del dataset."""
        logger.info("\n" + "=" * 80)
        logger.info("ANÁLISIS DE CALIDAD DE DATOS")
        logger.info("=" * 80)

        self.report['dataset_shape'] = df.shape
        self.report['total_samples'] = len(df)

        # Análisis simplificado (los métodos privados ya no son necesarios)
        logger.info("\n[1] ANÁLISIS BÁSICO")
        logger.info(f"  Total muestras: {len(df)}")
        logger.info(f"  Total features: {len(features)}")

        # Missing values
        missing_info = {}
        for col in features:
            if col in df.columns:
                n_missing = df[col].isna().sum()
                if n_missing > 0:
                    missing_info[col] = {'count': int(n_missing), 'percentage': float(n_missing / len(df) * 100)}

        self.report['missing_values'] = missing_info

        # Duplicados
        if 'kepoi_name' in df.columns:
            koi_counts = df['kepoi_name'].value_counts()
            duplicated_kois = (koi_counts > 1).sum()
            logger.info(f"\n[2] DUPLICADOS")
            logger.info(f"  KOIs con múltiples observaciones: {duplicated_kois}")
            self.report['duplicate_kois'] = int(duplicated_kois)

        # Data leakage
        if 'koi_score' in df.columns and 'koi_disposition' in df.columns:
            logger.info(f"\n[3] DATA LEAKAGE")
            logger.warning("  ⚠️  koi_score presente - ALTO RIESGO DE LEAKAGE")
            self.report['leakage_detected'] = True

        # Guardar reporte
        report_path = self.save_dir / 'data_quality_report.json'
        with open(report_path, 'w') as f:
            json.dump(self.report, f, indent=2)
        logger.info(f"\n✓ Reporte guardado en: {report_path}")

        return self.report

class DataCleaner:
    """Limpieza mejorada con transformaciones."""

    def __init__(self, config: DataConfig):
        self.config = config

        # Features con data leakage - ELIMINAR
        self.leakage_features = [
            'koi_score',           # Score de disposición (0.896 correlación)
            'koi_pdisposition',    # Preliminary disposition
        ]

        # Features que necesitan log transform
        self.log_transform_features = [
            'koi_period',
            'koi_depth',
            'koi_prad',
            'koi_insol',
            'koi_srad',
            'koi_model_snr'
        ]

    def clean(self, df: pd.DataFrame, diagnosis: Dict) -> pd.DataFrame:
        """Limpieza completa."""
        logger.info("\n" + "="*80)
        logger.info("LIMPIEZA DE DATOS MEJORADA")
        logger.info("="*80)

        initial_len = len(df)

        # 1. CRÍTICO: Eliminar features con leakage
        df = self._remove_leakage_features(df)

        # 2. Eliminar duplicados de KOI
        df = self._remove_duplicate_kois(df)

        # 3. Eliminar inconsistencias físicas (más agresivo)
        df = self._remove_physical_inconsistencies_strict(df)

        # 4. Aplicar transformaciones logarítmicas
        df = self._apply_log_transforms(df)

        # 5. Eliminar outliers extremos DESPUÉS de log transform
        df = self._remove_extreme_outliers_post_transform(df)

        final_len = len(df)
        removed = initial_len - final_len
        logger.info(f"\nLimpieza completa: {initial_len} → {final_len} ({removed} eliminadas, {removed/initial_len*100:.1f}%)")

        return df

    def _remove_leakage_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Elimina features que causan data leakage."""
        logger.info("\n[1] Eliminando features con data leakage...")

        removed = []
        for feat in self.leakage_features:
            if feat in df.columns:
                df = df.drop(columns=[feat])
                removed.append(feat)
                logger.info(f"  ✓ Eliminado: {feat}")

        if not removed:
            logger.info("  No se encontraron features con leakage")

        return df

    def _remove_duplicate_kois(self, df: pd.DataFrame) -> pd.DataFrame:
        """Elimina KOIs duplicados (código anterior)"""
        if 'kepoi_name' not in df.columns:
            return df

        logger.info("\n[2] Eliminando KOIs duplicados...")

        df_sorted = df.copy()
        df_sorted['_snr_fill'] = df_sorted.get('koi_model_snr', pd.Series([0]*len(df_sorted))).fillna(0)

        df_sorted = df_sorted.sort_values(
            by=['kepoi_name', '_snr_fill'],
            ascending=[True, False]
        )

        #before = len(df_sorted)
        #df_dedup = df_sorted.drop_duplicates(subset='kepoi_name', keep='first')
        #after = len(df_dedup)

        #df_dedup = df_dedup.drop(columns=['_snr_fill'], errors='ignore')

        #logger.info(f"  Eliminados: {before - after} KOIs duplicados")
        return df_sorted

    def _remove_physical_inconsistencies_strict(self, df: pd.DataFrame) -> pd.DataFrame:
        """Limpieza estricta de valores físicamente imposibles."""
        logger.info("\n[3] Eliminando inconsistencias físicas (estricto)...")

        mask = pd.Series([True] * len(df), index=df.index)

        # Período: 0.2 - 730 días (planetas con órbitas hasta 2 años)
        if 'koi_period' in df.columns:
            invalid = (df['koi_period'] <= 0.2) | (df['koi_period'] > 730)
            mask &= ~invalid
            if invalid.sum() > 0:
                logger.info(f"  Eliminadas {invalid.sum()} filas con período fuera de [0.2, 730] días")

        # Radio planetario: 0.5 - 30 R_earth (más grande que Júpiter es raro pero posible)
        if 'koi_prad' in df.columns:
            invalid = (df['koi_prad'] < 0.5) | (df['koi_prad'] > 30)
            mask &= ~invalid
            if invalid.sum() > 0:
                logger.info(f"  Eliminadas {invalid.sum()} filas con radio fuera de [0.5, 30] R_earth")

        # Profundidad: 10 - 100,000 ppm
        if 'koi_depth' in df.columns:
            invalid = (df['koi_depth'] < 10) | (df['koi_depth'] > 100000)
            mask &= ~invalid
            if invalid.sum() > 0:
                logger.info(f"  Eliminadas {invalid.sum()} filas con profundidad fuera de [10, 100k] ppm")

        # Temperatura: 100 - 3000 K (rango habitable extendido)
        if 'koi_teq' in df.columns:
            invalid = (df['koi_teq'] < 100) | (df['koi_teq'] > 3000)
            mask &= ~invalid
            if invalid.sum() > 0:
                logger.info(f"  Eliminadas {invalid.sum()} filas con temperatura fuera de [100, 3000] K")

        # Radio planeta NO puede ser > radio estrella
        if {'koi_prad', 'koi_srad'}.issubset(df.columns):
            invalid = df['koi_prad'] > (df['koi_srad'] * 109.1)  # R_sun to R_earth
            mask &= ~invalid
            if invalid.sum() > 0:
                logger.info(f"  Eliminadas {invalid.sum()} filas con radio planeta > radio estrella")

        return df[mask].copy()

    def _apply_log_transforms(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aplica transformaciones logarítmicas a features con skew extremo."""
        logger.info("\n[4] Aplicando transformaciones logarítmicas...")

        for feat in self.log_transform_features:
            if feat not in df.columns:
                continue

            # Solo transformar valores positivos
            mask = df[feat] > 0
            if mask.sum() == 0:
                continue

            # Crear nueva columna log
            new_col = f'log_{feat}'
            df[new_col] = np.nan
            df.loc[mask, new_col] = np.log10(df.loc[mask, feat])

            # Eliminar columna original
            df = df.drop(columns=[feat])

            # Renombrar log column al nombre original (para compatibilidad)
            df = df.rename(columns={new_col: feat})

            logger.info(f"  ✓ Transformado: {feat} → log10({feat})")

        return df

    def _remove_extreme_outliers_post_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Elimina outliers extremos DESPUÉS de transformación log."""
        logger.info("\n[5] Eliminando outliers post-transformación...")

        critical_features = self.config.required_features
        mask = pd.Series([True] * len(df), index=df.index)

        for feature in critical_features:
            if feature not in df.columns:
                continue

            data = df[feature].dropna()
            if len(data) == 0:
                continue

            # Usar 5*IQR (muy permisivo, solo elimina extremos)
            Q1 = data.quantile(0.25)
            Q3 = data.quantile(0.75)
            IQR = Q3 - Q1

            lower = Q1 - 5 * IQR
            upper = Q3 + 5 * IQR

            invalid = (df[feature] < lower) | (df[feature] > upper)
            if invalid.sum() > 0:
                logger.info(f"  {feature}: eliminados {invalid.sum()} outliers extremos")
                mask &= ~invalid

        return df[mask].copy()


# Resto del código sin cambios...
class DataLoader:
    """Carga y limpieza de datos."""

    def __init__(self, config: DataConfig):
        self.config = config

    def load(self) -> pd.DataFrame:
        """Carga CSV."""
        logger.info(f"Cargando {self.config.data_path}")
        df = pd.read_csv(self.config.data_path, comment='#')
        logger.info(f"  Cargado: {len(df)} filas")
        return df

    def filter_classes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filtra solo clases válidas."""
        valid_classes = self.config.class_labels.keys()
        df_filtered = df[df['koi_disposition'].isin(valid_classes)].copy()
        logger.info(f"  Con clases válidas: {len(df_filtered)} filas")
        return df_filtered


class FeatureEngineer:
    """Feature engineering mejorado."""

    def __init__(self, config: DataConfig):
        self.config = config
        self.feature_names = None

    def prepare(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Pipeline completo de preparación."""
        df = self._remove_critical_nulls(df)
        df = self._impute_optional(df)

        X, y = self._extract_features_labels(df)
        self._log_distribution(y)

        return X, y

    def _remove_critical_nulls(self, df: pd.DataFrame) -> pd.DataFrame:
        """Elimina filas sin features críticas."""
        initial_len = len(df)
        df = df.dropna(subset=self.config.required_features).copy()
        dropped = initial_len - len(df)
        if dropped > 0:
            logger.info(f"\n  Eliminadas {dropped} filas sin features críticas")
        return df

    def _impute_optional(self, df: pd.DataFrame) -> pd.DataFrame:
        """Imputa features opcionales."""
        logger.info("\nImputación de valores faltantes:")
        for col in self.config.optional_features:
            if col not in df.columns:
                continue

            if df[col].isna().any():
                if self.config.imputation_strategy == 'median':
                    fill_value = df[col].median()
                elif self.config.imputation_strategy == 'mean':
                    fill_value = df[col].mean()
                else:
                    continue

                n_imputed = df[col].isna().sum()
                df.loc[:, col] = df[col].fillna(fill_value)  # Fix pandas warning
                logger.info(f"  {col}: {n_imputed} valores → {self.config.imputation_strategy}={fill_value:.2e}")

        return df

    def _extract_features_labels(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Extrae matrices X, y."""
        all_features = self.config.required_features + self.config.optional_features
        available_features = [f for f in all_features if f in df.columns]

        self.feature_names = available_features
        logger.info(f"\nFeatures finales: {len(available_features)}")
        logger.info(f"  {', '.join(available_features)}")

        X = df[available_features].values
        y = df['koi_disposition'].map(self.config.class_labels).values

        logger.info(f"\nDataset final: {len(X)} samples, {len(available_features)} features")

        return X, y

    def _log_distribution(self, y: np.ndarray):
        """Log distribución de clases."""
        unique, counts = np.unique(y, return_counts=True)
        logger.info("\nDistribución de clases:")
        for label_idx, count in zip(unique, counts):
            label_name = [k for k, v in self.config.class_labels.items() if v == label_idx][0]
            pct = count / len(y) * 100
            logger.info(f"  {label_name}: {count} ({pct:.1f}%)")


class DataSplitter:
    """Manejo de splits train/test/val."""

    def __init__(self, config: DataConfig):
        self.config = config

    def split(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> Dict[str, np.ndarray]:
        """Crea splits estratificados."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config.test_size,
            stratify=y,
            random_state=self.config.random_state
        )

        result = {
            'X_train': X_train,
            'y_train': y_train,
            'X_test': X_test,
            'y_test': y_test
        }

        if self.config.val_size > 0:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train,
                test_size=self.config.val_size / (1 - self.config.test_size),
                stratify=y_train,
                random_state=self.config.random_state
            )
            result['X_train'] = X_train
            result['y_train'] = y_train
            result['X_val'] = X_val
            result['y_val'] = y_val

        self._log_splits(result)
        return result

    def _log_splits(self, splits: Dict[str, np.ndarray]):
        """Log tamaños de splits."""
        logger.info("\nSplits:")
        logger.info(f"  Train: {len(splits['y_train'])} samples")
        if 'y_val' in splits:
            logger.info(f"  Val:   {len(splits['y_val'])} samples")
        logger.info(f"  Test:  {len(splits['y_test'])} samples")


def apply_smote_if_enabled(splits: Dict[str, np.ndarray], data_config: DataConfig):
    """Aplica SMOTE al conjunto de entrenamiento si está habilitado en la configuración.

    Esta función intenta importar imblearn y aplicar SMOTE. Si la librería no está
    disponible, hace un log y devuelve los splits sin modificar.
    """
    if not getattr(data_config, 'use_smote', False):
        return splits

    try:
        import importlib
        SMOTE = getattr(importlib.import_module('imblearn.over_sampling'), 'SMOTE')
    except Exception as e:
        logger.warning(
            "SMOTE habilitado en configuración pero 'imbalanced-learn' no está disponible o falló al importar.\n"
            f"Error import: {e}\n"
            "Se aplicará un oversampling aleatorio (fallback) para balancear las clases."
        )
        # Fallback: Random oversampling simple (sin dependencia externa)
        X_train = splits['X_train']
        y_train = splits['y_train']

        # calcular conteos por clase
        unique, counts = np.unique(y_train, return_counts=True)
        max_count = counts.max()

        X_res_list = []
        y_res_list = []
        for cls in unique:
            cls_mask = (y_train == cls)
            X_cls = X_train[cls_mask]
            y_cls = y_train[cls_mask]

            if len(y_cls) == 0:
                continue

            if len(y_cls) < max_count:
                # resample with replacement
                idx = np.random.randint(0, len(y_cls), size=(max_count,))
                X_up = X_cls[idx]
                y_up = y_cls[idx]
            else:
                X_up = X_cls
                y_up = y_cls

            X_res_list.append(X_up)
            y_res_list.append(y_up)

        X_res = np.vstack(X_res_list)
        y_res = np.hstack(y_res_list)

        # mezclar
        perm = np.random.permutation(len(y_res))
        splits['X_train'] = X_res[perm]
        splits['y_train'] = y_res[perm]

        logger.info(f"  Antes oversampling: {len(y_train)} muestras; Después oversampling: {len(splits['y_train'])} muestras")
        return splits

    X_train = splits['X_train']
    y_train = splits['y_train']

    logger.info("Aplicando SMOTE al conjunto de entrenamiento...")
    smote = SMOTE(
        sampling_strategy=getattr(data_config, 'smote_sampling_strategy', 'auto'),
        k_neighbors=getattr(data_config, 'smote_k_neighbors', 5),
        random_state=getattr(data_config, 'smote_random_state', 42)
    )

    try:
        X_res, y_res = smote.fit_resample(X_train, y_train)
    except Exception as e:
        logger.warning(f"Fallo al aplicar SMOTE: {e}. Se continuará sin augmentation.")
        return splits

    logger.info(f"  Antes SMOTE: {len(y_train)} muestras; Después SMOTE: {len(y_res)} muestras")

    splits['X_train'] = X_res
    splits['y_train'] = y_res
    return splits

    def _log_splits(self, splits: Dict[str, np.ndarray]):
        """Log tamaños de splits."""
        logger.info("\nSplits:")
        logger.info(f"  Train: {len(splits['y_train'])} samples")
        if 'y_val' in splits:
            logger.info(f"  Val:   {len(splits['y_val'])} samples")
        logger.info(f"  Test:  {len(splits['y_test'])} samples")


def load_and_prepare_data(
    data_config: Optional[DataConfig] = None,
    run_diagnosis: bool = True
) -> Tuple[Dict[str, np.ndarray], list]:
    """Pipeline completo con diagnóstico."""
    if data_config is None:
        from config import DATA_CONFIG
        data_config = DATA_CONFIG

    # Load
    loader = DataLoader(data_config)
    df = loader.load()
    df = loader.filter_classes(df)

    # Diagnosis
    if run_diagnosis:
        all_features = data_config.required_features + data_config.optional_features
        analyzer = DataQualityAnalyzer()
        diagnosis = analyzer.analyze(df, all_features)

        # Clean con mejoras
        cleaner = DataCleaner(data_config)
        df = cleaner.clean(df, diagnosis)

    # Engineer
    engineer = FeatureEngineer(data_config)
    X, y = engineer.prepare(df)

    # Split
    splitter = DataSplitter(data_config)
    splits = splitter.split(X, y)

    # Aplicar SMOTE al entrenamiento si está activado en la configuración
    splits = apply_smote_if_enabled(splits, data_config)

    return splits, engineer.feature_names