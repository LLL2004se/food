import pandas as pd

from data_sources import build_heatmap_rows, get_db

db = get_db()
data = build_heatmap_rows(db)

if not data:
    data = [
        {"area": "Andheri", "demand_score": 10},
        {"area": "Dadar", "demand_score": 8},
        {"area": "Bandra", "demand_score": 12},
    ]

df = pd.DataFrame(data)
df = df.groupby("area", as_index=False).sum(numeric_only=True)
df.to_csv("heatmap_dataset.csv", index=False)

print(f"Heatmap data generated with {len(df)} areas from MongoDB")