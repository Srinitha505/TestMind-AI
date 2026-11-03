from pathlib import Path
import joblib

MODEL_PATH = Path(__file__).parent / "models" / "severity_model.joblib"
_model = None

def load_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
    return _model

def analyze_severity(text: str):
    model = load_model()

    if model is None:
        raise RuntimeError("Model not found. Run: python train_model.py")

    probabilities = model.predict_proba([text])[0]
    classifier = model.named_steps["classifier"]
    classes = classifier.classes_

    probability_details = {
        str(label): round(float(probability), 4)
        for label, probability in zip(classes, probabilities)
    }

    index = int(probabilities.argmax())
    severity = str(classes[index])
    confidence = float(probabilities[index])

    confidence_level = (
        "Low" if confidence < 0.50
        else "Moderate" if confidence < 0.70
        else "Higher"
    )

    explanation = []

    try:
        transformed_text = model[:-1].transform([text])
        feature_names = model[:-1].get_feature_names_out()
        class_weights = classifier.coef_[index]
        contributions = transformed_text.multiply(class_weights).toarray()[0]

        ranked_features = sorted(
            zip(feature_names, contributions),
            key=lambda item: item[1],
            reverse=True
        )

        explanation = [
            str(feature)
            for feature, contribution in ranked_features
            if contribution > 0
        ][:5]

    except Exception:
        explanation = []

    if not explanation:
        explanation = ["The model used the overall bug report text to make this prediction."]

    return {
        "severity": severity,
        "confidence": round(confidence, 4),
        "probabilities": probability_details,
        "confidence_level": confidence_level,
        "explanation": explanation
    }

def predict_severity_details(text: str):
    result = analyze_severity(text)
    return result["severity"], result["confidence"], result["probabilities"]

def predict_severity(text: str):
    severity, confidence, _ = predict_severity_details(text)
    return severity, confidence