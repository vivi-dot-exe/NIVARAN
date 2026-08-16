import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Read the Supabase/Neon PostgreSQL URL from the environment variable;
#    fall back to local SQLite if running on your machine without cloud variables.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jansetu.db")

# 2. Fix compatibility: Render/Postgres URLs starting with 'postgres://' 
#    need to be converted to 'postgresql://' for modern SQLAlchemy versions.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. SQLite requires `check_same_thread: False`; PostgreSQL will throw an error if passed.
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# 4. Create Engine & Sessionmaker (Identical signatures used across main.py and models.py)
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Base model declaration
Base = declarative_base()