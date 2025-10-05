"""
Extrae un CSV limpio a partir de koi_merged.csv con las columnas necesarias
(y quita duplicados por kepoi_name manteniendo la fila con mayor koi_model_snr).

Salida: koi_merged_pruned.csv en la raíz del repo.
"""
import pandas as pd
from pathlib import Path
import importlib.util

# Cargar config.py dinámicamente desde la raíz del repo
repo_root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('config', str(repo_root / 'config.py'))
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)
DATA_CONFIG = config.DATA_CONFIG

src = Path(DATA_CONFIG.data_path)
out = Path('koi_merged_pruned.csv')

print(f"Cargando {src}")
df = pd.read_csv(src, comment='#')
print(f"Filas originales: {len(df)}")

# Filtrar solo clases válidas si existe la columna
if 'koi_disposition' in df.columns:
    valid = list(DATA_CONFIG.class_labels.keys())
    df = df[df['koi_disposition'].isin(valid)].copy()
    print(f"Filas después de filtrar clases válidas: {len(df)}")

# Asegurarnos de que la columna koi_model_snr esté presente para ordenar
if 'koi_model_snr' not in df.columns:
    df['koi_model_snr'] = 0.0

# Ordenar por kepoi_name y koi_model_snr desc para mantener mejor SNR
if 'kepoi_name' in df.columns:
    df['_snr_fill'] = df['koi_model_snr'].fillna(0)
    df = df.sort_values(by=['kepoi_name', '_snr_fill'], ascending=[True, False])
    before = len(df)
    df = df.drop_duplicates(subset='kepoi_name', keep='first')
    after = len(df)
    print(f"Duplicados removidos por 'kepoi_name': {before - after}")
    df = df.drop(columns=['_snr_fill'])
else:
    print("Advertencia: columna 'kepoi_name' no encontrada; no se eliminarán duplicados por nombre.")

# Seleccionar columnas necesarias
all_features = DATA_CONFIG.required_features + DATA_CONFIG.optional_features
cols = [c for c in (['kepoi_name', 'koi_disposition'] + all_features) if c in df.columns]
print(f"Columnas seleccionadas ({len(cols)}): {cols}")

df_out = df[cols].copy()

df_out.to_csv(out, index=False)
print(f"Guardado: {out} ({len(df_out)} filas)")
