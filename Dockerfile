FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
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

# Use startup script as default command
CMD ["bash", "startup.sh"]