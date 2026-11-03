# TestMind AI

A local-first AI-assisted software quality engineering dashboard.

## Features
- Local TF-IDF + Logistic Regression bug severity classifier
- Rule-based acceptance-criteria to test-case generation
- Risk-based test prioritisation
- SQLite persistence through SQLAlchemy
- FastAPI backend
- React + Vite dashboard
- Pytest backend tests
- Playwright-ready browser automation example

> The included training dataset is intentionally small and illustrative. Treat model predictions as a demo, not as production defect triage. Expand and validate the dataset before making real QA decisions.

## Requirements
- Python 3.10+
- Node.js 18+

## 1. Backend setup (Windows PowerShell)
```powershell
cd backend
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python train_model.py
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000  
Swagger docs: http://127.0.0.1:8000/docs

If PowerShell blocks activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 2. Frontend setup
Open a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (normally http://localhost:5173).

## 3. Run tests
From `backend` with its virtual environment active:
```powershell
pytest
```

## 4. API examples
Create a bug:
```json
{
  "title": "Checkout crashes after clicking Pay",
  "description": "The application returns a server error after the user submits payment.",
  "steps": "1. Add an item. 2. Open checkout. 3. Click Pay.",
  "expected": "Payment should complete and show confirmation.",
  "actual": "The page returns HTTP 500.",
  "environment": "Chrome, Windows 11"
}
```

Generate test cases:
```json
{
  "requirement": "A registered user can sign in with a valid email and password. Invalid credentials show an error. After five failed attempts the account is temporarily locked."
}
```

## Architecture
- `backend/app/ml.py`: local model loading and inference
- `backend/app/services.py`: test generation and risk scoring
- `backend/app/main.py`: REST API and persistence
- `frontend/src`: React dashboard

## Suggested GitHub publishing
Create a public repository named `testmind-ai`, then from this folder:
```powershell
git init
git add .
git commit -m "Build TestMind AI quality engineering platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/testmind-ai.git
git push -u origin main
```
Do not commit `.venv`, `node_modules`, generated database files, or secrets.
