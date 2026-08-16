import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Read the Supabase/Neon/Render PostgreSQL URL from the environment variable;
#    fall back to local SQLite if running on your machine without cloud variables.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jansetu.db")

# 2. Fix compatibility: Render/Postgres URLs starting with 'postgres://' 
#    need to be converted to 'postgresql://' for modern SQLAlchemy versions.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. SQLite requires `check_same_thread: False`; PostgreSQL will throw an error if passed.
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# 4. Create Engine & Sessionmaker
engine_kwargs = {"connect_args": connect_args}
if "sqlite" not in DATABASE_URL:
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Base model declaration
Base = declarative_base()

def get_db():
    """Dependency for yielding database sessions safely."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()