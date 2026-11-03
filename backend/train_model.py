
from pathlib import Path
import csv
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = Path(__file__).parent
DATASET_PATH = BASE_DIR / "bug_dataset.csv"
MODEL_DIR = BASE_DIR / "app" / "models"

LABELS = ["Critical", "High", "Medium", "Low"]

def load_dataset():
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

    if not descriptions:
        raise ValueError("No valid dataset examples found")

    if set(severities) != set(LABELS):
        raise ValueError("Dataset must contain all four severity classes")

    return descriptions, severities

def create_model():
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            lowercase=True,
            strip_accents="unicode",
            sublinear_tf=True
        )),
        ("classifier", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        ))
    ])

def main():
    x, y = load_dataset()

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.20,
        stratify=y,
        random_state=42
    )

    evaluation_model = create_model()
    evaluation_model.fit(x_train, y_train)

    predictions = evaluation_model.predict(x_test)

    print("\nINDEPENDENT TEST RESULTS")
    print("------------------------------")
    print(f"Total examples: {len(x)}")
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

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(
        evaluation_model,
        MODEL_DIR / "severity_model_eval.joblib"
    )

    final_model = create_model()
    final_model.fit(x, y)

    joblib.dump(
        final_model,
        MODEL_DIR / "severity_model.joblib"
    )

    print("\nTRAINING COMPLETE")
    print("Evaluation model: severity_model_eval.joblib")
    print("Dashboard model: severity_model.joblib")
    print(f"Final model trained on all {len(x)} examples")

if __name__ == "__main__":
    main()
