import pandas as pd

from data_sources import build_demand_training_rows, get_db

try:
    db = get_db()
    data = build_demand_training_rows(db)

    if not data:
        raise Exception("No data in database")

    df = pd.DataFrame(data)
    print(f"Successfully built {len(data)} training rows from MongoDB")
    
except Exception as e:
    print(f"Using sample dataset: {e}")
    
    # Sample data if MongoDB is not available or empty
    data = [
        {"donation_count": 50, "ngo_requests": 1, "month": 1, "demand": 70},
        {"donation_count": 60, "ngo_requests": 1, "month": 2, "demand": 90},
        {"donation_count": 80, "ngo_requests": 1, "month": 3, "demand": 120},
        {"donation_count": 40, "ngo_requests": 0, "month": 4, "demand": 55},
        {"donation_count": 90, "ngo_requests": 1, "month": 5, "demand": 140},
        {"donation_count": 100, "ngo_requests": 1, "month": 6, "demand": 170},
    ]
    df = pd.DataFrame(data)
    print(f"Using {len(data)} sample donations")

print("\nDataset:")
print(df)
df.to_csv("dataset.csv", index=False)
print("\nDataset saved to dataset.csv")