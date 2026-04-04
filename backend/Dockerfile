FROM python:3.11-slim

# /app is the project root, backend code lives at /app/backend
WORKDIR /app

# System deps for aiomysql
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source into /app/backend/
COPY . ./backend/

# Set PYTHONPATH so 'from backend.x import y' resolves
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
