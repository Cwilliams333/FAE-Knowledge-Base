FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
COPY requirements-dev.txt .
COPY pytest.ini .
COPY ./tests ./tests
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY ingest.py .
COPY startup.sh .

# Make startup script executable
RUN chmod +x startup.sh

# Create documents directory
RUN mkdir -p /app/documents

# Expose port
EXPOSE 5000

# Use Gunicorn as the production server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]