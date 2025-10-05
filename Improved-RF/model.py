"""
Wrapper del modelo Random Forest.
"""
from sklearn.ensemble import RandomForestClassifier
import numpy as np
import logging
from typing import Optional
from pathlib import Path
import joblib

from config import ModelConfig

logger = logging.getLogger(__name__)


class ExoplanetRandomForest:
    """Wrapper de Random Forest con interfaz limpia."""

    def __init__(self, config: Optional[ModelConfig] = None):
        if config is None:
            from config import MODEL_CONFIG
            config = MODEL_CONFIG

        self.config = config
        self.model = None
        self.is_trained = False

    def build(self):
        """Construye el modelo."""
        self.model = RandomForestClassifier(
            n_estimators=self.config.n_estimators,
            max_depth=self.config.max_depth,
            min_samples_split=self.config.min_samples_split,
            min_samples_leaf=self.config.min_samples_leaf,
            max_features=self.config.max_features,
            class_weight=self.config.class_weight,
            random_state=self.config.random_state,
            n_jobs=self.config.n_jobs,
            verbose=self.config.verbose
        )
        logger.info("Modelo Random Forest construido")

    def train(self, X_train: np.ndarray, y_train: np.ndarray):
        """Entrena el modelo."""
        if self.model is None:
            self.build()

        logger.info("Entrenando modelo...")
        self.model.fit(X_train, y_train)
        self.is_trained = True
        logger.info("  Entrenamiento completado")

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predice clases."""
        if not self.is_trained:
            raise RuntimeError("Modelo no entrenado")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predice probabilidades."""
        if not self.is_trained:
            raise RuntimeError("Modelo no entrenado")
        return self.model.predict_proba(X)

    def get_feature_importances(self) -> np.ndarray:
        """Retorna feature importances."""
        if not self.is_trained:
            raise RuntimeError("Modelo no entrenado")
        return self.model.feature_importances_

    def save(self, path: str, extra: Optional[dict] = None):
        """Guarda el modelo y metadata en `path` usando joblib.

        Se guarda un diccionario con clave 'model' y opcionalmente datos extra.
        """
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)

        payload = {'model': self.model}
        if extra:
            payload.update(extra)

        joblib.dump(payload, p)
        logger.info(f"Modelo guardado en: {p}")

    def load(self, path: str):
        """Carga un modelo guardado por `save`.

        Retorna el diccionario cargado (payload).
        """
        p = Path(path)
        payload = joblib.load(p)
        self.model = payload.get('model', payload)
        self.is_trained = True
        logger.info(f"Modelo cargado desde: {p}")
        return payload