"""
Genera visualizaciones del RandomForest guardado en results/model.joblib:
 - feature_importance.png
 - tree_0.png, tree_1.png, ... (n árboles, con max_depth para legibilidad)

Uso:
  python tools/visualize_forest.py --n-trees 3 --max-depth 3 --output-dir results

"""
import argparse
from pathlib import Path
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from sklearn import tree


def load_model(path: Path):
    payload = joblib.load(path)
    if isinstance(payload, dict) and 'model' in payload:
        model = payload['model']
        feature_names = payload.get('feature_names')
    else:
        model = payload
        feature_names = None
    return model, feature_names


def plot_feature_importance(model, feature_names, out_path: Path):
    fi = model.feature_importances_
    if feature_names is None:
        feature_names = [f'f{i}' for i in range(len(fi))]
    idx = np.argsort(fi)[::-1]
    plt.figure(figsize=(8, max(4, len(fi)*0.2)))
    plt.barh([feature_names[i] for i in idx], fi[idx])
    plt.gca().invert_yaxis()
    plt.title('Feature importances')
    plt.tight_layout()
    plt.savefig(out_path)
    plt.close()


def plot_tree_png(dt, feature_names, out_path: Path, max_depth: int = 3):
    plt.figure(figsize=(20, 10))
    tree.plot_tree(dt, feature_names=feature_names, filled=True, max_depth=max_depth, fontsize=8)

    # Post-process text in each node: limitar a máximo 2 palabras por línea
    ax = plt.gca()
    for txt in ax.texts:
        s = txt.get_text()
        # dividir por whitespace y recomponer con saltos de línea cada 2 palabras
        words = s.split()
        if not words:
            continue
        lines = [" ".join(words[i:i+2]) for i in range(0, len(words), 2)]
        new_s = "\n".join(lines)
        txt.set_text(new_s)
    plt.tight_layout()
    plt.savefig(out_path)
    plt.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=str, default='results/model.joblib')
    parser.add_argument('--n-trees', type=int, default=3)
    parser.add_argument('--max-depth', type=int, default=3)
    parser.add_argument('--output-dir', type=str, default='results')
    args = parser.parse_args()

    model_path = Path(args.model)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    model, feature_names = load_model(model_path)
    if not hasattr(model, 'feature_importances_'):
        raise RuntimeError('El modelo cargado no parece ser un RandomForest con feature_importances_')

    # Feature importance
    fi_path = out_dir / 'feature_importance_rf.png'
    plot_feature_importance(model, feature_names, fi_path)
    print(f'Feature importance guardada en: {fi_path}')

    # Seleccionar índices de árboles a plotear (e.g., primeros n)
    n = min(args.n_trees, len(getattr(model, 'estimators_', [])))
    for i in range(n):
        dt = model.estimators_[i]
        tree_path = out_dir / f'tree_{i}.png'
        plot_tree_png(dt, feature_names, tree_path, max_depth=args.max_depth)
        print(f'Tree {i} guardado en: {tree_path}')

if __name__ == '__main__':
    main()
