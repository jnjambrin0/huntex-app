"""
Script de inferencia rápida para el modelo entrenado.

Usage examples (PowerShell):
  # Usar un CSV de entrada con las mismas columnas que el modelo espera:
  & .\venv\Scripts\python.exe predict_example.py --input examples/my_inputs.csv --output results/predictions.csv

  # Si no proporcionas un CSV, crea un ejemplo dummy con ceros (una fila) y predice:
  & .\venv\Scripts\python.exe predict_example.py

Este script carga `results/model.joblib` (creado por el pipeline de entrenamiento), extrae
`feature_names` y `class_labels` si están presentes en el payload guardado, valida el dataset
entrada y escribe las predicciones y probabilidades en `--output` (por defecto `predictions.csv`).
"""

import argparse
import sys
from pathlib import Path
import joblib
import pandas as pd
import numpy as np


def load_model(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Modelo no encontrado en: {path}. Ejecuta el pipeline de entrenamiento primero.")
    payload = joblib.load(path)
    # payload puede ser un estimator directamente o un dict que contiene 'model'
    if isinstance(payload, dict) and 'model' in payload:
        model = payload['model']
    else:
        model = payload
    feature_names = None
    class_labels = None
    if isinstance(payload, dict):
        feature_names = payload.get('feature_names')
        class_labels = payload.get('class_labels')
    return model, feature_names, class_labels


def build_dummy_df(feature_names, n_rows=1):
    # Construye un DataFrame dummy con ceros para cada feature
    data = {f: [0.0] * n_rows for f in feature_names}
    return pd.DataFrame(data)


def reverse_class_map(class_labels: dict):
    if class_labels is None:
        return None
    return {v: k for k, v in class_labels.items()}


def main():
    parser = argparse.ArgumentParser(description='Inferencia usando el modelo entrenado (results/model.joblib)')
    parser.add_argument('--model', type=str, default='results/model.joblib', help='Ruta al modelo joblib')
    parser.add_argument('--input', type=str, default=None, help='CSV de entrada con columnas de features')
    parser.add_argument('--output', type=str, default='predictions.csv', help='CSV de salida con predicciones')
    parser.add_argument('--n-dummy', type=int, default=1, help='Si no hay input, crear N filas dummy')

    args = parser.parse_args()

    model_path = Path(args.model)
    try:
        model, feature_names, class_labels = load_model(model_path)
    except Exception as e:
        print(f"ERROR al cargar el modelo: {e}")
        sys.exit(1)

    # Cargar input
    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"ERROR: archivo de entrada no encontrado: {input_path}")
            sys.exit(1)
        df = pd.read_csv(input_path)
        if feature_names is not None:
            missing = [f for f in feature_names if f not in df.columns]
            if missing:
                print(f"ERROR: el CSV de entrada no contiene las columnas requeridas por el modelo: {missing}")
                sys.exit(1)
            X = df[feature_names].values
        else:
            # Si no tenemos feature_names guardadas, asumimos que todas las columnas numéricas son features
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if not numeric_cols:
                print("ERROR: no se detectaron columnas numéricas en el CSV de entrada y no hay feature_names en el modelo.")
                sys.exit(1)
            X = df[numeric_cols].values
            feature_names = numeric_cols
    else:
        # Crear dummy
        if feature_names is None:
            print("Aviso: el modelo cargado no contiene 'feature_names' en sus metadata; creando una fila dummy con 1 feature (valor 0).")
            feature_names = ['feature_0']
        df = build_dummy_df(feature_names, n_rows=args.n_dummy)
        X = df.values
        print(f"Se creó un dataset dummy de {len(df)} fila(s) con features: {feature_names}")

    # Predecir
    try:
        y_pred = model.predict(X)
    except Exception as e:
        print(f"ERROR durante la predicción: {e}")
        sys.exit(1)

    # Probabilidades si están disponibles
    proba = None
    if hasattr(model, 'predict_proba'):
        try:
            proba = model.predict_proba(X)
        except Exception:
            proba = None

    # Mapear etiquetas a nombres humanos
    rev_map = reverse_class_map(class_labels)
    if rev_map:
        pred_labels = [rev_map.get(int(p), str(p)) for p in y_pred]
    else:
        pred_labels = [str(int(p)) for p in y_pred]

    # Construir DataFrame de salida
    out = df.copy()
    out['pred_label_idx'] = y_pred
    out['pred_label'] = pred_labels
    if proba is not None:
        # añadir columna por cada clase (si class_labels conocida, usar nombres)
        n_classes = proba.shape[1]
        for i in range(n_classes):
            col_name = f'proba_class_{i}'
            if rev_map and i in rev_map:
                col_name = f'proba_{rev_map[i]}'
            out[col_name] = proba[:, i]

    out_path = Path(args.output)
    out.to_csv(out_path, index=False)
    print(f"Predicciones guardadas en: {out_path}")


if __name__ == '__main__':
    main()
