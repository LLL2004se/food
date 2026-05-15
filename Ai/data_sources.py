import math
import os
import re
from collections import defaultdict
from datetime import datetime

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/food_donation_db"
MONGODB_URI = os.getenv("MONGODB_URI", DEFAULT_MONGODB_URI)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "food_donation_db")

FOOD_TYPE_MAP = {
    "vegetables": 0,
    "fruits": 1,
    "cooked": 2,
    "bakery": 3,
    "dairy": 4,
    "packaged": 5,
    "other": 6,
}


def get_db():
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[MONGODB_DB_NAME]


def parse_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def month_number(value):
    parsed = parse_datetime(value)
    return parsed.month if parsed else 1


def normalize_area(address):
    text = str(address or "").strip()
    if not text:
        return "unknown"
    area = re.split(r"[,\-]", text)[0].strip()
    return area or "unknown"


def food_type_to_index(food_type):
    return FOOD_TYPE_MAP.get(str(food_type or "other").lower(), FOOD_TYPE_MAP["other"])


def haversine_distance_km(lat1, lng1, lat2, lng2):
    values = [lat1, lng1, lat2, lng2]
    if any(value is None for value in values):
        return None

    try:
        lat1, lng1, lat2, lng2 = map(float, values)
    except (TypeError, ValueError):
        return None

    radius_km = 6371.0
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def seasonal_temperature_proxy(month):
    if month in {4, 5, 6}:
        return 35
    if month in {7, 8, 9}:
        return 30
    if month in {10, 11}:
        return 28
    return 24


def build_demand_training_rows(db):
    donations = list(db.donations.find({}, {"quantity": 1, "createdAt": 1}))
    requests = list(db.requests.find({}, {"requested_quantity": 1, "createdAt": 1}))

    monthly_data = defaultdict(lambda: {"donation_quantity": 0, "request_count": 0, "request_quantity": 0})

    for donation in donations:
        month = month_number(donation.get("createdAt"))
        monthly_data[month]["donation_quantity"] += float(donation.get("quantity", 0) or 0)

    for request in requests:
        month = month_number(request.get("createdAt"))
        monthly_data[month]["request_count"] += 1
        monthly_data[month]["request_quantity"] += float(request.get("requested_quantity", 0) or 0)

    rows = []
    for month in sorted(monthly_data.keys()):
        month_info = monthly_data[month]
        demand = month_info["request_quantity"]
        if demand <= 0:
            donation_quantity = month_info["donation_quantity"]
            demand = donation_quantity + max(10, int(donation_quantity * 0.2))

        rows.append(
            {
                "donation_count": int(month_info["donation_quantity"]),
                "ngo_requests": int(month_info["request_count"]),
                "month": month,
                "demand": float(demand),
            }
        )

    return rows


def build_heatmap_rows(db):
    donations = list(db.donations.find({}, {"address": 1, "quantity": 1}))
    area_scores = defaultdict(float)

    for donation in donations:
        area = normalize_area(donation.get("address"))
        area_scores[area] += float(donation.get("quantity", 0) or 0)

    return [{"area": area, "demand_score": score} for area, score in sorted(area_scores.items())]


def build_spoilage_rows(db):
    donations = list(
        db.donations.find(
            {},
            {"food_type": 1, "expiry_time": 1, "createdAt": 1, "location": 1, "address": 1},
        )
    )
    pickups = list(
        db.pickups.find(
            {"status": "delivered"},
            {
                "donation_id": 1,
                "createdAt": 1,
                "picked_at": 1,
                "delivered_at": 1,
                "pickupLatitude": 1,
                "pickupLongitude": 1,
                "ngoLatitude": 1,
                "ngoLongitude": 1,
                "pickup_location": 1,
            },
        )
    )

    pickup_by_donation = {}
    for pickup in pickups:
        donation_id = pickup.get("donation_id")
        if donation_id is not None:
          pickup_by_donation[str(donation_id)] = pickup

    rows = []
    for donation in donations:
        donation_id = str(donation.get("_id"))
        pickup = pickup_by_donation.get(donation_id)
        if not pickup:
            continue

        created_at = parse_datetime(donation.get("createdAt")) or parse_datetime(pickup.get("createdAt"))
        delivered_at = parse_datetime(pickup.get("delivered_at"))
        picked_at = parse_datetime(pickup.get("picked_at"))

        if delivered_at and picked_at:
            delivery_time = max(1.0, (delivered_at - picked_at).total_seconds() / 60.0)
        elif delivered_at and created_at:
            delivery_time = max(1.0, (delivered_at - created_at).total_seconds() / 60.0)
        else:
            continue

        pickup_lat = pickup.get("pickupLatitude")
        pickup_lng = pickup.get("pickupLongitude")
        pickup_location = pickup.get("pickup_location") or {}
        pickup_lat = pickup_lat if pickup_lat is not None else pickup_location.get("lat")
        pickup_lng = pickup_lng if pickup_lng is not None else pickup_location.get("lng")

        donation_location = donation.get("location") or {}
        distance = haversine_distance_km(
            donation_location.get("lat"),
            donation_location.get("lng"),
            pickup.get("ngoLatitude") or pickup_lat,
            pickup.get("ngoLongitude") or pickup_lng,
        )
        if distance is None:
            continue

        month = month_number(created_at)
        temperature = seasonal_temperature_proxy(month)
        expiry_time = parse_datetime(donation.get("expiry_time"))
        time_until_expiry = None
        if expiry_time and created_at:
            time_until_expiry = (expiry_time - created_at).total_seconds() / 60.0

        risk = 0
        if delivery_time > 240 or temperature >= 35:
            risk = 2
        elif delivery_time > 120 or temperature >= 30 or distance > 15:
            risk = 1

        if time_until_expiry is not None:
            if time_until_expiry <= 120:
                risk = 2
            elif time_until_expiry <= 360:
                risk = max(risk, 1)

        rows.append(
            {
                "food_type": food_type_to_index(donation.get("food_type")),
                "distance": round(distance, 2),
                "delivery_time": round(delivery_time, 2),
                "temperature": temperature,
                "risk": risk,
            }
        )

    return rows