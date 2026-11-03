
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from .database import Base


class Bug(Base):
    __tablename__ = "bugs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(240), nullable=False)
    description = Column(Text, nullable=False)
    steps = Column(Text, default="")
    expected = Column(Text, default="")
    actual = Column(Text, default="")
    environment = Column(String(240), default="")
    severity = Column(String(20), nullable=False)
    confidence = Column(Float, default=0.0)
    status = Column(String(30), default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(30), nullable=False, index=True)
    requirement = Column(Text, nullable=False)
    title = Column(String(240), nullable=False)
    steps = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium")
    category = Column(String(50), default="Functional")
    status = Column(String(20), default="Not Run")
    actual_result = Column(Text, default="")
    execution_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
