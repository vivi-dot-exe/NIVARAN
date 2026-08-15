from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text
from database import Base


class Ticket(Base):
    __tablename__ = "Ticket"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    category = Column(String, default="Uncategorized", nullable=True)
    priority_score = Column(Integer, default=0, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
