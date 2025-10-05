"""
Configuración centralizada para experimentación.
Cambia parámetros aquí sin tocar el código.
"""
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class DataConfig:
    """Configuración de datos."""
    data_path: str = 'koi_merged.csv'

    # Features
    required_features: List[str] = field(default_factory=lambda: [
        'koi_period',
        'koi_depth',
        'koi_duration',
        'koi_prad'
    ])

    optional_features: List[str] = field(default_factory=lambda: [
        'koi_teq',
        'koi_insol',
        'koi_steff',
        'koi_slogg',
        'koi_srad',
        'koi_score',
        'koi_model_snr',
        'koi_impact'
    ])

    # Clases
    class_labels: Dict[str, int] = field(default_factory=lambda: {
        'CONFIRMED': 0,
        'CANDIDATE': 1,
        'FALSE POSITIVE': 2
    })

    # Splits
    test_size: float = 0.2
    val_size: float = 0.0  # 0 = no validation split
    random_state: int = 42

    # Imputation
    imputation_strategy: str = 'median'  # 'median', 'mean', 'drop'
    # SMOTE augmentation (desactivar por defecto)
    use_smote: bool = True
    smote_sampling_strategy: str = 'auto'  # 'auto', float, dict-like
    smote_k_neighbors: int = 5
    smote_random_state: int = 42


@dataclass
class ModelConfig:
    """Configuración del modelo."""
    # Random Forest params
    n_estimators: int = 200
    max_depth: int = 15
    min_samples_split: int = 5
    min_samples_leaf: int = 2
    max_features: str = 'sqrt'  # 'sqrt', 'log2', None
    class_weight: str = 'balanced'  # 'balanced', None, dict

    # Training
    random_state: int = 42
    n_jobs: int = -1
    verbose: int = 0


@dataclass
class EvaluationConfig:
    """Configuración de evaluación."""
    cv_folds: int = 5
    output_dir: str = 'results'

    # Visualización
    plot_confusion_matrix: bool = True
    plot_feature_importance: bool = True
    top_n_features: int = 15

    # Métricas
    metrics: List[str] = field(default_factory=lambda: [
        'accuracy', 'f1_macro', 'f1_weighted', 'precision', 'recall'
    ])


# Configuraciones globales
DATA_CONFIG = DataConfig()
MODEL_CONFIG = ModelConfig()
EVAL_CONFIG = EvaluationConfig()