
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class BugCreate(BaseModel):
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(min_length=10)
    steps: str = ""
    expected: str = ""
    actual: str = ""
    environment: str = ""


class BugOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    severity: str
    confidence: float
    status: str
    created_at: Optional[str] = None


class RequirementIn(BaseModel):
    requirement: str = Field(min_length=15)


class StatusUpdate(BaseModel):
    status: str


class TestCaseCreate(BaseModel):
    requirement: str = Field(min_length=15)
    case_id: str = Field(min_length=3, max_length=30)
    title: str = Field(min_length=3, max_length=240)
    steps: str = Field(min_length=1)
    expected_result: str = Field(min_length=1)
    priority: str = "Medium"
    category: str = "Functional"


class TestCaseUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=240)
    steps: str = Field(min_length=1)
    expected_result: str = Field(min_length=1)
    priority: str
    category: str


class TestExecutionUpdate(BaseModel):
    status: str
    actual_result: str = ""
    execution_notes: str = ""


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: str
    requirement: str
    title: str
    steps: str
    expected_result: str
    priority: str
    category: str
    status: str
    actual_result: str
    execution_notes: str
    created_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
