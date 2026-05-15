from collections import defaultdict

import joblib
import numpy as np
import pandas as pd

from data_sources import build_demand_training_rows, get_db

print("Starting model training...", flush=True)
try:
    print("Fetching training data from MongoDB...", flush=True)
    db = get_db()
    data = build_demand_training_rows(db)

    if not data:
        print("No database data found, using sample dataset...", flush=True)
        data = [
            {"donation_count": 50, "ngo_requests": 1, "month": 1, "demand": 70},
            {"donation_count": 60, "ngo_requests": 1, "month": 2, "demand": 90},
            {"donation_count": 80, "ngo_requests": 1, "month": 3, "demand": 120},
            {"donation_count": 40, "ngo_requests": 0, "month": 4, "demand": 55},
            {"donation_count": 90, "ngo_requests": 1, "month": 5, "demand": 140},
            {"donation_count": 100, "ngo_requests": 1, "month": 6, "demand": 170},
        ]
    
    # Create DataFrame and save to CSV
    df = pd.DataFrame(data)
    print(f"Data loaded: {len(df)} rows", flush=True)
    print(df, flush=True)
    
    # Save to CSV for reference
    df.to_csv("dataset.csv", index=False)
    
    # Prepare features and target
    X = df[["donation_count", "ngo_requests", "month"]].values
    y = df["demand"].values
    
    # Add intercept term (ones column)
    X = np.column_stack([np.ones(len(X)), X])
    
    # Simple linear regression using normal equation: (X^T X)^-1 X^T y
    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]
    
    # Store as a simple dict model
    model = {
        'coefficients': coefficients,
        'intercept': coefficients[0],
        'coef': coefficients[1:]
    }
    
    print(f"Features: {len(df)} rows, Target shape: {y.shape}", flush=True)
    print("Model fitted successfully", flush=True)
    
    joblib.dump(model, "demand_model.pkl")
    print("Model saved successfully", flush=True)
    print("Model trained and updated successfully!")
    
except Exception as e:
    print(f"Error: {e}", flush=True)
    import traceback
    traceback.print_exc()
    import sys
    sys.exit(1)