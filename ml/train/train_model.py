import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

print("Loading training data...")

# Load CSV that Node.js export script generates
csv_path = os.path.join(os.path.dirname(__file__), "../../training_data.csv")
df = pd.read_csv(csv_path)

print("Training model...")

X = df.drop(columns=["label"])
y = df["label"]

model = RandomForestRegressor(
    n_estimators=300,
    max_depth=15,
    random_state=42
)

model.fit(X, y)

out_path = os.path.join(os.path.dirname(__file__), "../model/model.pkl")
joblib.dump(model, out_path)

print(f"Model saved at: {out_path}")
