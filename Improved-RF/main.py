"""
Punto de entrada principal.
Permite experimentación fácil.
"""
import logging
from pathlib import Path

from config import DataConfig, ModelConfig, EvaluationConfig
from train import train_and_evaluate

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def experiment_baseline():
    """Experimento baseline."""
    logger.info("Ejecutando experimento BASELINE")
    model, metrics = train_and_evaluate()
    return model, metrics


def experiment_deep_trees():
    """Experimento con árboles más profundos."""
    logger.info("Ejecutando experimento DEEP TREES")

    model_config = ModelConfig(
        max_depth=25,  # Más profundo
        min_samples_split=2
    )

    eval_config = EvaluationConfig(
        output_dir='results/deep_trees'
    )

    model, metrics = train_and_evaluate(
        model_config=model_config,
        eval_config=eval_config
    )
    return model, metrics


def experiment_more_estimators():
    """Experimento con más árboles."""
    logger.info("Ejecutando experimento MORE ESTIMATORS")

    model_config = ModelConfig(
        n_estimators=500  # Más árboles
    )

    eval_config = EvaluationConfig(
        output_dir='results/more_estimators'
    )

    model, metrics = train_and_evaluate(
        model_config=model_config,
        eval_config=eval_config
    )
    return model, metrics


if __name__ == '__main__':
    # Ejecuta experimento baseline
    experiment_baseline()

    # Descomenta para probar otros experimentos
    # experiment_deep_trees()
    # experiment_more_estimators()