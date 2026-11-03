
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Bug, TestCase
from .schemas import (
    BugCreate,
    RequirementIn,
    StatusUpdate,
    TestCaseUpdate,
    TestExecutionUpdate
)
from .ml import analyze_severity
from .services import generate_test_cases, prioritise_cases, risk_score

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TestMind AI API",
    version="1.2.0",
    description="Local-first AI-assisted software quality engineering platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "TestMind AI",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
def health():
    model_path = Path(__file__).parent / "models" / "severity_model.joblib"

    return {
        "status": "healthy",
        "model_ready": model_path.exists(),
        "ai_mode": "local"
    }


@app.post("/api/bugs")
def create_bug(payload: BugCreate, db: Session = Depends(get_db)):
    combined = " ".join([
        payload.title,
        payload.description,
        payload.steps,
        payload.actual
    ])

    try:
        analysis = analyze_severity(combined)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    bug = Bug(
        title=payload.title,
        description=payload.description,
        steps=payload.steps,
        expected=payload.expected,
        actual=payload.actual,
        environment=payload.environment,
        severity=analysis["severity"],
        confidence=analysis["confidence"]
    )

    db.add(bug)
    db.commit()
    db.refresh(bug)

    result = bug_to_dict(bug)
    result["severity_probabilities"] = analysis["probabilities"]
    result["confidence_level"] = analysis["confidence_level"]
    result["ai_explanation"] = analysis["explanation"]

    return result


@app.get("/api/bugs")
def list_bugs(db: Session = Depends(get_db)):
    bugs = db.query(Bug).order_by(Bug.created_at.desc()).all()
    return [bug_to_dict(bug) for bug in bugs]


@app.patch("/api/bugs/{bug_id}/status")
def update_bug_status(
    bug_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db)
):
    if payload.status not in {"Open", "In Progress", "Resolved"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be Open, In Progress, or Resolved"
        )

    bug = db.query(Bug).filter(Bug.id == bug_id).first()

    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    bug.status = payload.status

    db.commit()
    db.refresh(bug)

    return bug_to_dict(bug)


@app.delete("/api/bugs/{bug_id}")
def delete_bug(bug_id: int, db: Session = Depends(get_db)):
    bug = db.query(Bug).filter(Bug.id == bug_id).first()

    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    db.delete(bug)
    db.commit()

    return {
        "deleted": True,
        "id": bug_id
    }


@app.post("/api/test-cases/generate")
def create_test_cases(
    payload: RequirementIn,
    db: Session = Depends(get_db)
):
    cases = prioritise_cases(
        generate_test_cases(payload.requirement)
    )

    saved_cases = []

    for case in cases:
        test_case = TestCase(
            case_id=case["id"],
            requirement=payload.requirement,
            title=case["title"],
            steps=case["steps"],
            expected_result=case["expected_result"],
            priority=case["priority"],
            category=case["category"],
            status="Not Run"
        )

        db.add(test_case)
        saved_cases.append(test_case)

    db.commit()

    for test_case in saved_cases:
        db.refresh(test_case)

    return {
        "count": len(saved_cases),
        "test_cases": [test_case_to_dict(case) for case in saved_cases]
    }


@app.get("/api/test-cases")
def list_test_cases(db: Session = Depends(get_db)):
    cases = (
        db.query(TestCase)
        .order_by(TestCase.created_at.desc(), TestCase.id.desc())
        .all()
    )

    return {
        "count": len(cases),
        "test_cases": [test_case_to_dict(case) for case in cases]
    }


@app.patch("/api/test-cases/{test_case_id}")
def edit_test_case(
    test_case_id: int,
    payload: TestCaseUpdate,
    db: Session = Depends(get_db)
):
    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id)
        .first()
    )

    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")

    allowed_priorities = {"Critical", "High", "Medium", "Low"}

    if payload.priority not in allowed_priorities:
        raise HTTPException(
            status_code=400,
            detail="Priority must be Critical, High, Medium, or Low"
        )

    allowed_categories = {
        "Functional",
        "Validation",
        "Authentication",
        "Security",
        "Performance",
        "Usability",
        "Compatibility",
        "Regression",
        "Integration"
    }

    if payload.category not in allowed_categories:
        raise HTTPException(
            status_code=400,
            detail="Invalid test case category"
        )

    test_case.title = payload.title
    test_case.steps = payload.steps
    test_case.expected_result = payload.expected_result
    test_case.priority = payload.priority
    test_case.category = payload.category

    db.commit()
    db.refresh(test_case)

    return test_case_to_dict(test_case)


@app.delete("/api/test-cases/{test_case_id}")
def delete_test_case(
    test_case_id: int,
    db: Session = Depends(get_db)
):
    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id)
        .first()
    )

    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")

    db.delete(test_case)
    db.commit()

    return {
        "deleted": True,
        "id": test_case_id,
        "case_id": test_case.case_id
    }


@app.patch("/api/test-cases/{test_case_id}/execution")
def update_test_execution(
    test_case_id: int,
    payload: TestExecutionUpdate,
    db: Session = Depends(get_db)
):
    allowed_statuses = {"Not Run", "Pass", "Fail", "Blocked"}

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be Not Run, Pass, Fail, or Blocked"
        )

    test_case = (
        db.query(TestCase)
        .filter(TestCase.id == test_case_id)
        .first()
    )

    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")

    test_case.status = payload.status
    test_case.actual_result = payload.actual_result
    test_case.execution_notes = payload.execution_notes
    test_case.executed_at = (
        datetime.utcnow()
        if payload.status != "Not Run"
        else None
    )

    db.commit()
    db.refresh(test_case)

    return test_case_to_dict(test_case)


@app.get("/api/test-cases/summary")
def test_execution_summary(db: Session = Depends(get_db)):
    cases = db.query(TestCase).all()
    total = len(cases)

    counts = {
        status: sum(1 for case in cases if case.status == status)
        for status in ["Not Run", "Pass", "Fail", "Blocked"]
    }

    executed = total - counts["Not Run"] if total else 0

    pass_percentage = (
        round(counts["Pass"] / executed * 100, 2)
        if executed else 0
    )

    return {
        "total": total,
        "not_run": counts["Not Run"],
        "passed": counts["Pass"],
        "failed": counts["Fail"],
        "blocked": counts["Blocked"],
        "executed": executed,
        "pass_percentage": pass_percentage
    }


@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    bugs = db.query(Bug).all()
    total = len(bugs)

    by_severity = {
        severity: sum(1 for bug in bugs if bug.severity == severity)
        for severity in ["Critical", "High", "Medium", "Low"]
    }

    by_status = {
        status: sum(1 for bug in bugs if bug.status == status)
        for status in ["Open", "In Progress", "Resolved"]
    }

    avg_confidence = (
        round(sum(bug.confidence for bug in bugs) / total, 3)
        if total else 0
    )

    return {
        "total_bugs": total,
        "open_bugs": by_status["Open"],
        "resolved_bugs": by_status["Resolved"],
        "average_model_confidence": avg_confidence,
        "by_severity": by_severity,
        "by_status": by_status,
        "risk_scores": [
            {
                "id": bug.id,
                "title": bug.title,
                "severity": bug.severity,
                "risk_score": risk_score(
                    bug.severity,
                    bug.confidence,
                    bug.status
                )
            }
            for bug in sorted(
                bugs,
                key=lambda item: risk_score(
                    item.severity,
                    item.confidence,
                    item.status
                ),
                reverse=True
            )[:5]
        ]
    }


def bug_to_dict(bug):
    return {
        "id": bug.id,
        "title": bug.title,
        "description": bug.description,
        "steps": bug.steps,
        "expected": bug.expected,
        "actual": bug.actual,
        "environment": bug.environment,
        "severity": bug.severity,
        "confidence": round(bug.confidence, 3),
        "status": bug.status,
        "created_at": (
            bug.created_at.isoformat()
            if bug.created_at
            else datetime.utcnow().isoformat()
        )
    }


def test_case_to_dict(case):
    return {
        "id": case.id,
        "case_id": case.case_id,
        "requirement": case.requirement,
        "title": case.title,
        "steps": case.steps,
        "expected_result": case.expected_result,
        "priority": case.priority,
        "category": case.category,
        "status": case.status,
        "actual_result": case.actual_result,
        "execution_notes": case.execution_notes,
        "created_at": (
            case.created_at.isoformat()
            if case.created_at else None
        ),
        "executed_at": (
            case.executed_at.isoformat()
            if case.executed_at else None
        )
    }
