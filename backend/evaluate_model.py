
from pathlib import Path
import csv
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = Path(__file__).parent
DATASET_PATH = BASE_DIR / "bug_dataset.csv"
MODEL_PATH = BASE_DIR / "app" / "models" / "severity_model_eval.joblib"

LABELS = ["Critical", "High", "Medium", "Low"]

def main():
    descriptions = []
    severities = []

    with open(DATASET_PATH, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            description = (row.get("description") or "").strip()
            severity = (row.get("severity") or "").strip()

            if description and severity in LABELS:
                descriptions.append(description)
                severities.append(severity)

    x_train, x_test, y_train, y_test = train_test_split(
        descriptions,
        severities,
        test_size=0.20,
        stratify=severities,
        random_state=42
    )

    model = joblib.load(MODEL_PATH)
    predictions = model.predict(x_test)

    print("\nINDEPENDENT MODEL EVALUATION")
    print("------------------------------")
    print(f"Training examples: {len(x_train)}")
    print(f"Test examples: {len(x_test)}")
    print(f"Accuracy: {accuracy_score(y_test, predictions):.2%}")

    print("\nCLASSIFICATION REPORT")
    print(classification_report(
        y_test,
        predictions,
        labels=LABELS,
        zero_division=0
    ))

    print("\nCONFUSION MATRIX")
    print("Labels:", LABELS)
    print(confusion_matrix(y_test, predictions, labels=LABELS))

if __name__ == "__main__":
    main()
