import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

from data_sources import build_spoilage_rows, get_db


def packaged_risk(distance, delivery_time, temperature):
	if delivery_time <= 120 and temperature <= 30:
		return 0
	if delivery_time <= 240 and temperature <= 35:
		return 1
	return 2


try:
	db = get_db()
	data = build_spoilage_rows(db)
	except_data_source = False
except Exception:
	data = []
	except_data_source = True

if data:
	data = pd.DataFrame(data)
else:
	data = pd.read_csv("spoilage_dataset.csv")
	packaged_rows = []
	for distance in [2, 5, 10, 15, 20, 25, 30]:
		for delivery_time in [30, 60, 120, 180, 240, 300]:
			for temperature in [18, 22, 26, 30, 34, 38]:
				packaged_rows.append({
					"food_type": 3,
					"distance": distance,
					"delivery_time": delivery_time,
					"temperature": temperature,
					"risk": packaged_risk(distance, delivery_time, temperature),
				})

	data = pd.concat([data, pd.DataFrame(packaged_rows)], ignore_index=True)

X = data[["food_type", "distance", "delivery_time", "temperature"]]
y = data["risk"]

model = RandomForestClassifier(random_state=42)
model.fit(X, y)

joblib.dump(model, "spoilage_model.pkl")

source_label = "MongoDB" if not except_data_source and len(data) else "fallback dataset"
print(f"Spoilage model trained from {source_label}")