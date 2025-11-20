from fastapi import FastAPI
import joblib
import numpy as np
import uvicorn
import os

app = FastAPI()

model_path = os.path.join(os.path.dirname(__file__), "../model/model.pkl")
model = joblib.load(model_path)

@app.post("/predict")
def predict(features: dict):
    X = np.array([[
        features["views"],
        features["likes"],
        features["comments"],
        features["shares"],
        features["velocity"],
        features["recencyMinutes"],
        features["avgWatchCompletion"],
        features["positiveReactionsRatio"],
        features["userCategoryMatch"],
        features["userAuthorAffinity"],
        features["pastBehaviorScore"],
        features["socialGraph"]
    ]])

    score = float(model.predict(X)[0])
    return {"score": score}

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9000
    )
