from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
import os
from flask_cors import CORS

from data_sources import build_heatmap_rows, get_db

app = Flask(__name__)
CORS(app)

# Area to lat/lng mapping for heatmap visualization (Mumbai areas)
AREA_COORDINATES = {
    'Andheri': [19.1136, 72.8697],
    'Andheri West': [19.1197, 72.8468],
    'Andheri East': [19.1136, 72.8697],
    'Dadar': [19.0178, 72.8478],
    'Kurla': [19.0726, 72.8845],
    'Bandra': [19.0596, 72.8295],
    'Borivali': [19.2307, 72.8567],
    'Thane': [19.2183, 72.9781],
    'Mulund': [19.1726, 72.9563],
    'Powai': [19.1176, 72.9060],
    'Goregaon': [19.1663, 72.8526],
    'Malad': [19.1874, 72.8484],
    'Kandivali': [19.2048, 72.8527],
    'Jogeshwari': [19.1364, 72.8490],
    'Vile Parle': [19.0968, 72.8517],
    'Santacruz': [19.0841, 72.8410],
    'Khar': [19.0724, 72.8363],
    'Churchgate': [18.9352, 72.8274],
    'CST': [18.9398, 72.8355],
    'Worli': [19.0176, 72.8153],
    'Lower Parel': [18.9930, 72.8310],
    'Chembur': [19.0522, 72.8994],
    'Ghatkopar': [19.0860, 72.9080],
    'Ghatkopar Mumbai': [19.0860, 72.9080],
    'Vikhroli': [19.1096, 72.9275],
    'Sion': [19.0410, 72.8640],
    'Wadala': [19.0177, 72.8675],
    'Navi Mumbai': [19.0330, 73.0297],
    'Panvel': [18.9894, 73.1175],
    'unknown': [19.0760, 72.8777],  # Default Mumbai center
}

model = joblib.load("demand_model.pkl")

# Location distribution weights (how demand is distributed across locations)
LOCATION_WEIGHTS = {
    'Andheri': 0.4,
    'Dadar': 0.5,
    'Kurla': 0.3,
}

@app.route("/predict-demand", methods=["POST"])
def predict_demand():
    try:
        data = request.json

        donation_count = data.get("donation_count", 0)
        ngo_requests = data.get("ngo_requests", 0)
        month = data.get("month", 1)

        # Use the model coefficients for prediction
        if isinstance(model, dict):
            # Model is stored as dict with coefficients
            intercept = model['intercept']
            coef = model['coef']
            prediction = intercept + (coef[0] * donation_count + coef[1] * ngo_requests + coef[2] * month)
        else:
            # Fallback for sklearn model
            prediction = model.predict([[donation_count, ngo_requests, month]])[0]

        return jsonify({
            "prediction": float(prediction),
            "donation_count": donation_count,
            "ngo_requests": ngo_requests,
            "month": month
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/predict-location-demand", methods=["POST"])
def predict_location_demand():
    try:
        data = request.json
        
        donation_count = data.get("donation_count", 0)
        ngo_requests = data.get("ngo_requests", 0)
        month = data.get("month", 1)
        
        # Calculate overall prediction
        if isinstance(model, dict):
            intercept = model['intercept']
            coef = model['coef']
            total_demand = intercept + (coef[0] * donation_count + coef[1] * ngo_requests + coef[2] * month)
        else:
            total_demand = model.predict([[donation_count, ngo_requests, month]])[0]
        
        # Distribute prediction across locations
        location_predictions = {}
        for location, weight in LOCATION_WEIGHTS.items():
            location_predictions[location] = int(total_demand * weight)
        
        return jsonify({
            "total_demand": float(total_demand),
            "locations": location_predictions,
            "donation_count": donation_count,
            "ngo_requests": ngo_requests,
            "month": month
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400
spoilage_model = joblib.load("spoilage_model.pkl")

@app.route("/predict-spoilage", methods=["POST"])
def predict_spoilage():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["food_type", "distance", "delivery_time", "temperature"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        prediction = spoilage_model.predict([[
            data["food_type"],
            data["distance"],
            data["delivery_time"],
            data["temperature"]
        ]])

        return jsonify({
            "risk_level": int(prediction[0]),
            "food_type": data["food_type"],
            "distance": data["distance"],
            "delivery_time": data["delivery_time"],
            "temperature": data["temperature"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/heatmap-data", methods=["GET"])
def heatmap():
    try:
        db = get_db()
        rows = build_heatmap_rows(db)
        result = []
        for row in rows:
            area = row.get("area", "unknown")
            coords = AREA_COORDINATES.get(area, AREA_COORDINATES["unknown"])
            result.append({
                "area": area,
                "lat": coords[0],
                "lng": coords[1],
                "demand_score": float(row.get("demand_score", 0))
            })
        return jsonify(result)
    except Exception:
        csv_path = os.path.join(os.path.dirname(__file__), "heatmap_dataset.csv")
        if not os.path.exists(csv_path):
            return jsonify({"error": "Heatmap dataset not found. Run train_heatmap_model.py first."}), 404
        df = pd.read_csv(csv_path)
        result = []
        for _, row in df.iterrows():
            area = row.get("area", "unknown")
            coords = AREA_COORDINATES.get(area, AREA_COORDINATES["unknown"])
            result.append({
                "area": area,
                "lat": coords[0],
                "lng": coords[1],
                "demand_score": float(row.get("demand_score", 0))
            })
        return jsonify(result)

if __name__ == "__main__":
    app.run(port=5001, debug=False)