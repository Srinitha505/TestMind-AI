
from pathlib import Path
import joblib

MODEL_PATH = Path(__file__).parent / "app" / "models" / "severity_model.joblib"

model = joblib.load(MODEL_PATH)

samples = [
    "The application crashes when every user tries to log in",
    "The profile page has a small spacing issue",
    "The product filter does not work after selecting a category",
    "Payment fails for several customers during checkout",
    "Unauthorized users can view private customer information",
    "The dashboard chart title is slightly misaligned",
    "The application takes too long to load reports",
    "Users cannot download their invoices",
]

predictions = model.predict(samples)
probabilities = model.predict_proba(samples)

print("\nTESTMIND AI - SAMPLE PREDICTIONS")
print("--------------------------------")

for description, prediction, scores in zip(samples, predictions, probabilities):
    confidence = max(scores) * 100

    print(f"\nBug: {description}")
    print(f"Predicted severity: {prediction}")
    print(f"Model confidence: {confidence:.2f}%")
