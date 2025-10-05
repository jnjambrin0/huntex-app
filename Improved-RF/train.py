"""
Pipeline de entrenamiento.
"""
import logging
from typing import Optional

from config import DataConfig, ModelConfig, EvaluationConfig
from pathlib import Path
from data import load_and_prepare_data
from model import ExoplanetRandomForest
from evaluate import ModelEvaluator
import numpy as np

logger = logging.getLogger(__name__)


def train_and_evaluate(
        data_config: Optional[DataConfig] = None,
        model_config: Optional[ModelConfig] = None,
        eval_config: Optional[EvaluationConfig] = None
):
    """Pipeline completo de entrenamiento y evaluación."""

    # Load configs
    if data_config is None:
        from config import DATA_CONFIG
        data_config = DATA_CONFIG
    if model_config is None:
        from config import MODEL_CONFIG
        model_config = MODEL_CONFIG
    if eval_config is None:
        from config import EVAL_CONFIG
        eval_config = EVAL_CONFIG

    # Load data
    logger.info("=" * 60)
    logger.info("CARGANDO DATOS")
    logger.info("=" * 60)
    splits, feature_names = load_and_prepare_data(data_config)

    # Build model
    logger.info("\n" + "=" * 60)
    logger.info("ENTRENANDO MODELO")
    logger.info("=" * 60)
    model = ExoplanetRandomForest(model_config)
    model.train(splits['X_train'], splits['y_train'])

    # Guardar modelo entrenado con metadata
    try:
        model.save(Path(eval_config.output_dir) / 'model.joblib', extra={'feature_names': feature_names, 'class_labels': data_config.class_labels})
    except Exception as e:
        logger.warning(f"No se pudo guardar el modelo: {e}")

    # Evaluate
    evaluator = ModelEvaluator(eval_config, data_config)

    # Train set (overfitting check)
    logger.info("\n" + "=" * 60)
    logger.info("EVALUACIÓN EN TRAIN")
    logger.info("=" * 60)
    metrics_train, _ = evaluator.evaluate(
        model, splits['X_train'], splits['y_train'], split_name='Train'
    )

    # Test set
    metrics_test, y_pred = evaluator.evaluate(
        model, splits['X_test'], splits['y_test'], split_name='Test'
    )

    # Visualizations
    evaluator.plot_confusion_matrix(
        splits['y_test'], y_pred, filename='confusion_matrix.png'
    )
    evaluator.plot_feature_importance(
        model, feature_names, filename='feature_importance.png'
    )

    # Cross-validation
    # Rebuild full dataset for CV
    X_full = np.vstack([splits['X_train'], splits['X_test']])
    y_full = np.hstack([splits['y_train'], splits['y_test']])
    cv_scores = evaluator.cross_validate(model, X_full, y_full)

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("RESUMEN FINAL")
    logger.info("=" * 60)
    logger.info(f"F1 Macro (Train): {metrics_train['f1_macro']:.4f}")
    logger.info(f"F1 Macro (Test):  {metrics_test['f1_macro']:.4f}")
    logger.info(f"F1 Macro (CV):    {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    logger.info(f"\nResultados en: {eval_config.output_dir}/")

    return model, metrics_test


if __name__ == '__main__':
    import numpy as np

    logging.basicConfig(level=logging.INFO)
    train_and_evaluate()