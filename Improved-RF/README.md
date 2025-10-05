# 🤖 HuntEX ML Model - Exoplanet Random Forest Classifier

> Built for NASA Space Apps Challenge Hackathon 🚀

A Random Forest machine learning model that classifies Kepler Objects of Interest (KOI) into confirmed exoplanets, candidates, or false positives. This is the brain behind the [HuntEX web application](https://github.com/jnjambrin0/huntex-app).

## 🎯 What is this?

This repository contains the complete machine learning pipeline for exoplanet detection using real Kepler telescope data. The model analyzes orbital parameters, planetary properties, stellar characteristics, and signal metrics to classify potential exoplanets with ~85% accuracy.

**Classifications:**
- **CONFIRMED** - Verified exoplanets
- **CANDIDATE** - Potential exoplanets requiring further analysis
- **FALSE POSITIVE** - Not an exoplanet

## ✨ Features

### 🧠 Machine Learning Pipeline
- **Random Forest classifier** with configurable hyperparameters
- **Feature engineering** with 12+ orbital and stellar parameters
- **Class balancing** via SMOTE (optional)
- **Cross-validation** for robust evaluation
- **Model persistence** with metadata tracking

### 📊 Data Processing
- **Smart imputation** strategies (median/mean/drop)
- **Train/test splitting** with reproducible random states
- **Feature importance** analysis and visualization
- **Confusion matrix** generation

### 🔬 Experimentation Framework
- **Configuration-driven** design (no code changes needed)
- **Multiple experiment presets** (baseline, deep trees, more estimators)
- **Automated evaluation** with comprehensive metrics
- **Result tracking** with organized output directories

### 📈 Model Evaluation
- **Accuracy, F1, Precision, Recall** metrics
- **Cross-validation scores** with confidence intervals
- **Train vs Test** comparison for overfitting detection
- **Feature importance** plots showing top contributors

## 🛠️ Tech Stack

- **Python 3.x** - Core language
- **scikit-learn** - Random Forest implementation
- **pandas + numpy** - Data manipulation
- **matplotlib + seaborn** - Visualization
- **imbalanced-learn** - SMOTE for class balancing
- **joblib** - Model serialization

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- pip or conda

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd exoplanet_rf

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Quick Start

```bash
# Train baseline model
python main.py
```

This will:
- Load and preprocess `koi_merged.csv`
- Train Random Forest classifier
- Evaluate on train/test splits
- Generate visualizations in `results/`
- Save trained model to `results/model.joblib`

## 📁 Project Structure

```
exoplanet_rf/
├── config.py              # Centralized configuration system
├── data.py                # Data loading & preprocessing pipeline
├── model.py               # Random Forest model wrapper
├── train.py               # Training & evaluation pipeline
├── evaluate.py            # Metrics, cross-validation & plots
├── main.py                # Entry point with experiment presets
├── predict_example.py     # Inference example script
├── tools/
│   ├── extract_clean_dataset.py    # Dataset cleaning utility
│   └── compare_predictions.py      # Prediction comparison tool
├── GAN/                   # Synthetic data generation (experimental)
│   └── main.py            # GAN training script
├── results/               # Model outputs & visualizations
├── diagnostics/           # Training diagnostics
└── examples/              # Example datasets & notebooks
```

## 🎮 How to Use

### Basic Training

```bash
python main.py
```

**Outputs:**
- `results/model.joblib` - Trained model with metadata
- `results/confusion_matrix.png` - Classification performance
- `results/feature_importance.png` - Top feature contributions
- Console logs with detailed metrics

### Configuration-Based Experiments

Edit `config.py` to customize:

```python
# Example: Enable SMOTE for class balancing
DATA_CONFIG = DataConfig(
    use_smote=True,
    smote_sampling_strategy='auto'
)

# Example: Deeper trees
MODEL_CONFIG = ModelConfig(
    n_estimators=300,
    max_depth=25,
    min_samples_split=2
)
```

### Predefined Experiments

Uncomment in `main.py`:

```python
# Deeper decision trees
experiment_deep_trees()

# More trees in ensemble
experiment_more_estimators()
```

Each experiment saves to separate directories (`results/deep_trees/`, etc.).

### Making Predictions

```bash
python predict_example.py
```

Or use programmatically:

```python
from model import ExoplanetRandomForest
from pathlib import Path

# Load trained model
model = ExoplanetRandomForest.load(Path('results/model.joblib'))

# Predict single sample
prediction = model.predict(sample_data)
probabilities = model.predict_proba(sample_data)
```

### Dataset Preprocessing

```bash
python tools/extract_clean_dataset.py
```

Cleans raw KOI data and outputs `koi_merged_pruned.csv`.

## 🔬 Technical Details

### Features Used (12 total)

**Required (4):**
- `koi_period` - Orbital period (days)
- `koi_depth` - Transit depth (ppm)
- `koi_duration` - Transit duration (hours)
- `koi_prad` - Planetary radius (Earth radii)

**Optional (8):**
- `koi_teq` - Equilibrium temperature (K)
- `koi_insol` - Insolation flux (Earth flux)
- `koi_steff` - Stellar effective temperature (K)
- `koi_slogg` - Stellar surface gravity (log10(cm/s²))
- `koi_srad` - Stellar radius (solar radii)
- `koi_score` - Disposition score
- `koi_model_snr` - Transit signal-to-noise ratio
- `koi_impact` - Impact parameter

### Model Architecture

- **Algorithm**: Random Forest (ensemble of decision trees)
- **Default trees**: 200 estimators
- **Max depth**: 15 levels
- **Class weighting**: Balanced (handles class imbalance)
- **Feature sampling**: Square root of total features
- **Parallelization**: All CPU cores (`n_jobs=-1`)

### Performance Metrics

Typical results on test set:
- **Accuracy**: ~85%
- **F1 Macro**: 0.75-0.80
- **F1 Weighted**: 0.82-0.87
- **Cross-validation**: 5-fold with ±4% std deviation

*Note: Results vary based on hyperparameters and class balancing strategy*

## 📊 Dataset

### Source
Kepler Objects of Interest (KOI) catalog from NASA's Kepler mission.

### File
- `koi_merged.csv` - Full dataset (~18 MB, 9,564 entries)
- `koi_merged_pruned.csv` - Cleaned dataset (~867 KB)

### Class Distribution (Imbalanced)
- FALSE POSITIVE: ~55%
- CANDIDATE: ~30%
- CONFIRMED: ~15%

SMOTE can be enabled in `config.py` to balance classes during training.

## 🎨 Visualizations

### Confusion Matrix
Shows true vs predicted classifications across all three classes.

![Confusion Matrix Example](results/confusion_matrix.png)

### Feature Importance
Displays top 11 features by their contribution to predictions.

![Feature Importance Example](results/feature_importance.png)

## 🧪 Experimental: GAN Data Augmentation

The `GAN/` directory contains a generative adversarial network for creating synthetic exoplanet data. This is experimental and aimed at improving class balance creatively.

```bash
cd GAN
python main.py
```

Generates `synthetic_exoplanets.csv` with artificial training samples.

## 🔧 Configuration Reference

### DataConfig (`config.py`)

```python
data_path: str              # CSV file path
required_features: List     # Must-have features
optional_features: List     # Nice-to-have features
class_labels: Dict          # Label to integer mapping
test_size: float            # Train/test split ratio (0.2 = 20% test)
random_state: int           # Reproducibility seed
imputation_strategy: str    # 'median', 'mean', or 'drop'
use_smote: bool             # Enable SMOTE balancing
```

### ModelConfig (`config.py`)

```python
n_estimators: int           # Number of trees (200)
max_depth: int              # Max tree depth (15)
min_samples_split: int      # Min samples to split node (5)
min_samples_leaf: int       # Min samples in leaf (2)
max_features: str           # Features per split ('sqrt')
class_weight: str           # 'balanced' or None
```

### EvaluationConfig (`config.py`)

```python
cv_folds: int               # Cross-validation folds (5)
output_dir: str             # Results directory
plot_confusion_matrix: bool # Generate CM plot
plot_feature_importance: bool # Generate FI plot
top_n_features: int         # Features to show (15)
```

## 🌐 Integration with HuntEX Web App

This model powers the backend predictions for [HuntEX](https://github.com/jnjambrin0/huntex-app).

**API Integration:**
1. Web app sends exoplanet parameters to Express server
2. Server calls `predict.py` with model input
3. Model loads `model.joblib` and returns classification
4. Web app visualizes results on interactive star map

## 👥 Team

Built with ❤️ for the NASA Space Apps Challenge by our amazing hackathon team.

## 📝 Notes

- Model performance depends heavily on hyperparameter tuning
- Class imbalance is a challenge (consider SMOTE or cost-sensitive learning)
- Feature engineering from domain knowledge can boost accuracy
- Models are saved with metadata (feature names, class labels) for reproducibility

## 🙏 Acknowledgments

- **NASA** for the Space Apps Challenge and Kepler data
- **scikit-learn** community for excellent ML tools
- **Kepler mission team** for exoplanet discoveries

---

**Questions?** Open an issue or reach out to the team.

Happy exoplanet hunting! 🔭✨
