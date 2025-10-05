"""
Evaluación y visualización de resultados.
"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, accuracy_score, precision_score, recall_score
)
from sklearn.model_selection import cross_val_score  # ← FIX: Movido aquí
from pathlib import Path
import logging
from typing import Dict, Optional

from config import EvaluationConfig, DataConfig

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluación comprehensiva del modelo."""

    def __init__(
            self,
            eval_config: Optional[EvaluationConfig] = None,
            data_config: Optional[DataConfig] = None
    ):
        if eval_config is None:
            from config import EVAL_CONFIG
            eval_config = EVAL_CONFIG
        if data_config is None:
            from config import DATA_CONFIG
            data_config = DATA_CONFIG

        self.eval_config = eval_config
        self.data_config = data_config

        # Crear directorio de salida
        Path(self.eval_config.output_dir).mkdir(exist_ok=True)

    def evaluate(
            self,
            model,
            X: np.ndarray,
            y_true: np.ndarray,
            split_name: str = 'Test'
    ) -> Dict[str, float]:
        """Evaluación completa."""
        y_pred = model.predict(X)

        logger.info(f"\n{'=' * 60}")
        logger.info(f"EVALUACIÓN EN {split_name.upper()} SET")
        logger.info('=' * 60)

        # Calcular métricas
        metrics = self._calculate_metrics(y_true, y_pred)
        self._log_metrics(metrics)

        # Classification report
        label_names = [k for k, v in sorted(
            self.data_config.class_labels.items(),
            key=lambda x: x[1]
        )]
        report = classification_report(y_true, y_pred, target_names=label_names)
        logger.info(f"\n{report}")

        return metrics, y_pred

    def _calculate_metrics(self, y_true, y_pred) -> Dict[str, float]:
        """Calcula métricas."""
        metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'f1_macro': f1_score(y_true, y_pred, average='macro'),
            'f1_weighted': f1_score(y_true, y_pred, average='weighted'),
            'precision_macro': precision_score(y_true, y_pred, average='macro', zero_division=0),
            'recall_macro': recall_score(y_true, y_pred, average='macro', zero_division=0)
        }
        return metrics

    def _log_metrics(self, metrics: Dict[str, float]):
        """Log métricas."""
        for metric_name, value in metrics.items():
            logger.info(f"{metric_name}: {value:.4f}")

    def plot_confusion_matrix(
            self,
            y_true: np.ndarray,
            y_pred: np.ndarray,
            filename: str = 'confusion_matrix.png'
    ):
        """Visualiza confusion matrix."""
        if not self.eval_config.plot_confusion_matrix:
            return

        cm = confusion_matrix(y_true, y_pred)
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

        plt.figure(figsize=(12, 10))
        sns.heatmap(
            cm_normalized,
            annot=True,
            fmt='.2%',
            cmap='Blues',
            xticklabels=list(self.data_config.class_labels.keys()),
            yticklabels=list(self.data_config.class_labels.keys())
        )
        plt.title('Confusion Matrix', fontsize=14, fontweight='bold')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()

        save_path = Path(self.eval_config.output_dir) / filename
        plt.savefig(save_path, dpi=300)
        plt.close()
        logger.info(f"  Confusion matrix guardada: {save_path}")

    def plot_feature_importance(
            self,
            model,
            feature_names: list,
            filename: str = 'feature_importance.png'
    ):
        """Visualiza feature importance."""
        if not self.eval_config.plot_feature_importance:
            return

        importances = pd.DataFrame({
            'feature': feature_names,
            'importance': model.get_feature_importances()
        }).sort_values('importance', ascending=False)

        logger.info("\nFeature Importance (Top 10):")
        for idx, row in importances.head(10).iterrows():
            logger.info(f"  {row['feature']}: {row['importance']:.4f}")

        # Plot
        plt.figure(figsize=(10, 8))
        top_n = min(self.eval_config.top_n_features, len(importances))
        top_features = importances.head(top_n)
        plt.barh(range(len(top_features)), top_features['importance'])
        plt.yticks(range(len(top_features)), top_features['feature'])
        plt.xlabel('Importance')
        plt.title(f'Top {top_n} Feature Importance', fontsize=14, fontweight='bold')
        plt.gca().invert_yaxis()
        plt.tight_layout()

        save_path = Path(self.eval_config.output_dir) / filename
        plt.savefig(save_path, dpi=300)
        plt.close()
        logger.info(f"  Feature importance guardada: {save_path}")

    def cross_validate(self, model, X: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Cross-validation."""
        logger.info(f"\nCross-Validation ({self.eval_config.cv_folds}-fold)...")

        # Rebuild model para CV
        model.build()

        scores = cross_val_score(
            model.model, X, y,
            cv=self.eval_config.cv_folds,
            scoring='f1_macro',
            n_jobs=-1
        )

        logger.info(f"  F1 Macro scores: {scores}")
        logger.info(f"  Mean: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")

        return scores