# TestMind AI – AI-Powered Quality Engineering Platform

TestMind AI is a local AI-powered Quality Engineering and Test Management platform designed to simplify software testing workflows. It combines machine learning-based bug severity prediction, automated test case generation, test execution management and QA report generation in one application.

## Project Overview

TestMind AI helps QA engineers manage software testing activities through an interactive dashboard and locally running backend services.

## Key Features

### 1. AI-Based Bug Intelligence
- Submit and manage software bug reports.
- Predict bug severity using a locally trained machine learning model.
- View and track recorded defects.

### 2. Automated Test Case Generation
- Generate test scenarios from software requirements.
- Organize test cases by priority and category.
- Save generated test cases in the local database.

### 3. Test Case Management
- View saved test cases.
- Edit test case titles, steps, expected results, priorities and categories.
- Delete unwanted test cases.

### 4. Test Execution Management
- Record execution status: Pass, Fail, Blocked or Not Run.
- Save actual results and execution notes.
- Track execution progress and pass rate.

### 5. QA Execution Reports
- Generate PDF execution reports.
- Export Excel workbooks.
- Review execution summaries, test case details and bug reports.

### 6. Dashboard
- View total test cases.
- Monitor execution rate and pass rate.
- Track bug reports and test execution status.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy |
| Machine Learning | Scikit-learn |
| Model Storage | Joblib |
| Reporting | jsPDF, jsPDF-AutoTable, XLSX |
| API Testing | Pytest |
| Version Control | Git, GitHub |

## Project Architecture

```text
TestMind-AI/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── ml.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── services.py
│   │
│   ├── automation/
│   ├── tests/
│   ├── requirements.txt
│   └── train_model.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

- Python 3.9 or compatible version
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Srinitha505/TestMind-AI.git
cd TestMind-AI
```

### 2. Set Up the Backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend URL:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

http://localhost:5173

## Testing

Backend tests are available using Pytest.

From the backend directory:

```bash
pytest
```

## Machine Learning

TestMind AI uses a locally stored machine learning model for bug severity prediction.

The model files are stored in:

```text
backend/app/models/
```

The application uses the trained model locally rather than requiring an external AI API.

## Reports

The application supports:

- PDF QA execution reports.
- Excel QA workbooks.
- Test execution summaries.
- Test case results.
- Bug report records.

## Project Goals

- Simplify software testing workflows.
- Improve test case management.
- Support bug severity classification.
- Provide organized execution tracking.
- Generate shareable QA reports.

## Future Enhancements

- Advanced QA analytics dashboard.
- Test execution trend visualizations.
- Defect severity analytics.
- Test coverage insights.
- Automated regression testing integrations.

## Author

**Srinitha Pabba**

B.Tech – Information Technology

GitHub: https://github.com/Srinitha505

## License

This project is available for educational and portfolio purposes. Add an explicit open-source license if you intend to permit reuse and redistribution.
