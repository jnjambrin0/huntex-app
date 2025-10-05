"""
Compara predicciones generadas por `predict_example.py` con el archivo expected.
Genera:
 - results/large_compare_report.txt: resumen (n, matches, mismatches, accuracy simple)
 - results/large_mismatches.csv: filas donde difieren (incluye expected y predicted y razones)
"""
import pandas as pd
from pathlib import Path

pred_path = Path('results/large_example_predictions.csv')
exp_path = Path('examples/large_example_expected.csv')
out_report = Path('results/large_compare_report.txt')
out_mism = Path('results/large_mismatches.csv')

if not pred_path.exists():
    print('Predictions file not found:', pred_path)
    raise SystemExit(1)
if not exp_path.exists():
    print('Expected file not found:', exp_path)
    raise SystemExit(1)

pred = pd.read_csv(pred_path)
exp = pd.read_csv(exp_path)

# Ensure we have a common index: row in expected corresponds to row order
# Align by position: add a 1-based row index to pred
pred = pred.reset_index(drop=True)
exp = exp.reset_index(drop=True)

# Use expected row numbers to align (expected 'row' column starts at 1)
# We'll compare by position: first expected row <-> first prediction row
n = min(len(pred), len(exp))

rows = []
matches = 0
for i in range(n):
    pred_idx = int(pred.loc[i, 'pred_label_idx']) if 'pred_label_idx' in pred.columns else None
    # expected may have expected_label_idx
    exp_idx = int(exp.loc[i, 'expected_label_idx']) if 'expected_label_idx' in exp.columns else None
    match = (pred_idx == exp_idx)
    if match:
        matches += 1
    rows.append({
        'row': i+1,
        'expected_label': exp.loc[i, 'expected_label'],
        'expected_label_idx': exp_idx,
        'pred_label': pred.loc[i, 'pred_label'] if 'pred_label' in pred.columns else str(pred_idx),
        'pred_label_idx': pred_idx,
        'match': match,
        'reason': exp.loc[i, 'reason'] if 'reason' in exp.columns else ''
    })

df_rows = pd.DataFrame(rows)
accuracy = matches / n if n>0 else 0.0

Path('results').mkdir(parents=True, exist_ok=True)
with open(out_report, 'w') as f:
    f.write(f'Total compared rows: {n}\n')
    f.write(f'Matches: {matches}\n')
    f.write(f'Mismatches: {n - matches}\n')
    f.write(f'Accuracy (simple match): {accuracy:.4f}\n')

# Save mismatches
mism = df_rows[~df_rows['match']]
mism.to_csv(out_mism, index=False)

print('Comparison done. Report:', out_report)
print('Mismatches CSV:', out_mism)
